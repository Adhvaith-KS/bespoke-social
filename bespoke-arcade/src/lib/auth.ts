/**
 * Auth helpers — Google sign-in via Supabase Auth, restricted to the
 * company domain. Slack OIDC replaces this later; the users-table mapping
 * (slack_id = `google:<email>`) keeps that migration a one-column swap.
 */
import { createServerClient, type CookieOptions } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { isSupabaseConfigured } from './supabase';

export const ALLOWED_DOMAIN = 'bespokelabs.ai';

export function isAllowedEmail(email: string | null | undefined): boolean {
  return !!email && email.toLowerCase().endsWith(`@${ALLOWED_DOMAIN}`);
}

export interface AuthedIdentity {
  email: string;
  name: string;
  avatarUrl: string | null;
}

/**
 * Read the signed-in Google identity from the request cookies.
 * Returns null when Supabase is unconfigured (demo mode), when nobody is
 * signed in, or when the account is outside the allowed domain.
 */
export async function getAuthedIdentity(): Promise<AuthedIdentity | null> {
  if (!isSupabaseConfigured()) return null;

  try {
    const cookieStore = await cookies();
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() {
            return cookieStore.getAll();
          },
          setAll(cookiesToSet: { name: string; value: string; options: CookieOptions }[]) {
            // Route handlers may not always allow writes; best-effort refresh
            try {
              cookiesToSet.forEach(({ name, value, options }) =>
                cookieStore.set(name, value, options)
              );
            } catch {
              /* read-only context */
            }
          },
        },
      }
    );

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user?.email || !isAllowedEmail(user.email)) return null;

    const meta = (user.user_metadata ?? {}) as Record<string, unknown>;
    const name =
      (typeof meta.full_name === 'string' && meta.full_name) ||
      (typeof meta.name === 'string' && meta.name) ||
      user.email.split('@')[0].replace(/[._]/g, ' ');

    return {
      email: user.email.toLowerCase(),
      name,
      avatarUrl:
        (typeof meta.avatar_url === 'string' && meta.avatar_url) || null,
    };
  } catch {
    return null;
  }
}
