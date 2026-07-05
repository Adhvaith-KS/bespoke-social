/**
 * Supabase server-side client.
 *
 * All database access goes through Next.js API routes (never the browser),
 * so this module is server-only. It prefers the service-role key and falls
 * back to the anon key for read-mostly local development.
 *
 * When env vars are absent the app runs in "demo mode": every API route
 * checks `getSupabase()` for null and serves mock data instead, so the UI
 * works before a Supabase project exists.
 */
import { createClient, type SupabaseClient } from '@supabase/supabase-js';

let cachedClient: SupabaseClient | null = null;

export function isSupabaseConfigured(): boolean {
  return Boolean(
    process.env.NEXT_PUBLIC_SUPABASE_URL &&
      (process.env.SUPABASE_SERVICE_ROLE_KEY ||
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY)
  );
}

export function getSupabase(): SupabaseClient | null {
  if (!isSupabaseConfigured()) return null;
  if (!cachedClient) {
    cachedClient = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY ||
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      { auth: { persistSession: false } }
    );
  }
  return cachedClient;
}

/** Today's date in UTC (the puzzle day boundary is 00:00 UTC). */
export function todayUTC(): string {
  return new Date().toISOString().split('T')[0];
}

export interface ArcadeUser {
  id: string;
  slack_id: string;
  name: string;
  avatar_url: string | null;
  role_title: string | null;
  region: 'US' | 'IN';
  timezone: string | null;
  opt_in_bereal: boolean;
  opt_in_ttal: boolean;
  opt_in_story: boolean;
}

/**
 * The signed-in player.
 *
 * With Google auth live, each @bespokelabs.ai account maps to its own
 * users row keyed by `slack_id = google:<email>` — a stable placeholder
 * until Sign in with Slack (OIDC) replaces it. If no session exists
 * (e.g. API called outside a request), we fall back to the seeded demo
 * user so tooling and the worker keep functioning.
 */
export const DEMO_SLACK_ID = 'U_DEMO_PLAYER';

async function getOrCreateUser(
  supabase: SupabaseClient,
  slackId: string,
  defaults: { name: string; role_title: string; avatar_url?: string | null }
): Promise<ArcadeUser | null> {
  const { data: existing } = await supabase
    .from('users')
    .select('*')
    .eq('slack_id', slackId)
    .maybeSingle();

  if (existing) return existing as ArcadeUser;

  const { data: created, error } = await supabase
    .from('users')
    .insert({
      slack_id: slackId,
      name: defaults.name,
      role_title: defaults.role_title,
      avatar_url: defaults.avatar_url ?? null,
      region: 'US',
      timezone: 'America/Los_Angeles',
    })
    .select('*')
    .single();

  if (error) return null;
  return created as ArcadeUser;
}

export async function getCurrentUser(
  supabase: SupabaseClient
): Promise<ArcadeUser | null> {
  // Prefer the authed Google identity (lazy import: lib/auth pulls in
  // next/headers, which must stay out of non-request contexts)
  try {
    const { getAuthedIdentity } = await import('./auth');
    const identity = await getAuthedIdentity();
    if (identity) {
      return getOrCreateUser(supabase, `google:${identity.email}`, {
        name: identity.name,
        role_title: 'Bespoke Labs',
        avatar_url: identity.avatarUrl,
      });
    }
  } catch {
    // outside a request scope — fall through to the demo user
  }

  return getOrCreateUser(supabase, DEMO_SLACK_ID, {
    name: 'Demo Player',
    role_title: 'Arcade Tester',
  });
}
