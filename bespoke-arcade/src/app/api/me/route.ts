import { NextRequest, NextResponse } from 'next/server';
import { getSupabase, getCurrentUser, todayUTC } from '@/lib/supabase';
import { currentStreak, longestStreak, GAME_EVENT_TYPES } from '@/lib/stats';

/**
 * Profile data for the signed-in player (demo user until Slack OIDC).
 * GET  → stats, streaks, badges, opt-ins — all derived from `events`.
 * PATCH → persist feature opt-in toggles onto the `users` row.
 */
export async function GET() {
  const supabase = getSupabase();
  if (!supabase) {
    return NextResponse.json({ live: false });
  }

  const user = await getCurrentUser(supabase);
  if (!user) {
    return NextResponse.json({ error: 'Could not resolve user' }, { status: 500 });
  }

  const [myEventsRes, allEventsRes, badgesRes] = await Promise.all([
    supabase
      .from('events')
      .select('type, points, created_at')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(5000),
    supabase.from('events').select('user_id, points').limit(20000),
    supabase
      .from('badges')
      .select('badge_key, label, awarded_at')
      .eq('user_id', user.id),
  ]);

  const myEvents = myEventsRes.data ?? [];
  const totalPoints = myEvents.reduce((sum, e) => sum + e.points, 0);

  // Rank: 1 + number of users with strictly more points
  const totals = new Map<string, number>();
  for (const e of allEventsRes.data ?? []) {
    totals.set(e.user_id, (totals.get(e.user_id) ?? 0) + e.points);
  }
  const rank =
    1 + [...totals.entries()].filter(
      ([id, pts]) => id !== user.id && pts > totalPoints
    ).length;

  const today = todayUTC();
  const timestampsFor = (game: 'wordle' | 'bespokle' | 'trivia') =>
    myEvents
      .filter((e) => GAME_EVENT_TYPES[game]!.includes(e.type))
      .map((e) => e.created_at);
  const allTimestamps = myEvents.map((e) => e.created_at);

  return NextResponse.json({
    live: true,
    user: {
      name: user.name,
      role: user.role_title,
      region: user.region,
      avatarUrl: user.avatar_url,
      initials: user.name
        .split(/\s+/)
        .slice(0, 2)
        .map((p) => p[0]?.toUpperCase() ?? '')
        .join(''),
    },
    stats: {
      totalPoints,
      rank,
      totalEvents: myEvents.length,
      longestStreak: longestStreak(allTimestamps),
    },
    streaks: {
      wordle: currentStreak(timestampsFor('wordle'), today),
      bespokle: currentStreak(timestampsFor('bespokle'), today),
      trivia: currentStreak(timestampsFor('trivia'), today),
      any: currentStreak(allTimestamps, today),
    },
    badges: (badgesRes.data ?? []).map((b) => ({
      key: b.badge_key,
      label: b.label,
      awardedAt: b.awarded_at,
    })),
    optIns: {
      bereal: user.opt_in_bereal,
      ttal: user.opt_in_ttal,
      story: user.opt_in_story,
    },
  });
}

const OPT_IN_COLUMNS: Record<string, string> = {
  bereal: 'opt_in_bereal',
  ttal: 'opt_in_ttal',
  story: 'opt_in_story',
};

export async function PATCH(request: NextRequest) {
  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const updates: Record<string, boolean> = {};
  for (const [key, column] of Object.entries(OPT_IN_COLUMNS)) {
    if (typeof body[key] === 'boolean') updates[column] = body[key] as boolean;
  }
  if (Object.keys(updates).length === 0) {
    return NextResponse.json(
      { error: 'Nothing to update. Send bereal/ttal/story booleans' },
      { status: 400 }
    );
  }

  const supabase = getSupabase();
  if (!supabase) {
    return NextResponse.json({ live: false, saved: false });
  }

  const user = await getCurrentUser(supabase);
  if (!user) {
    return NextResponse.json({ error: 'Could not resolve user' }, { status: 500 });
  }

  const { data, error } = await supabase
    .from('users')
    .update(updates)
    .eq('id', user.id)
    .select('opt_in_bereal, opt_in_ttal, opt_in_story')
    .single();

  if (error || !data) {
    return NextResponse.json({ error: 'Update failed' }, { status: 500 });
  }

  return NextResponse.json({
    live: true,
    saved: true,
    optIns: {
      bereal: data.opt_in_bereal,
      ttal: data.opt_in_ttal,
      story: data.opt_in_story,
    },
  });
}
