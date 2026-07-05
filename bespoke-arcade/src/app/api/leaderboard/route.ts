import { NextRequest, NextResponse } from 'next/server';
import { getSupabase, todayUTC } from '@/lib/supabase';
import {
  buildStandings,
  GAME_EVENT_TYPES,
  type EventRow,
  type GameKey,
  type UserRow,
} from '@/lib/stats';

/**
 * Leaderboard data, derived entirely from the `events` ledger.
 * `?game=` selects a tab: global | wordle | bespokle | trivia | bereal.
 * Returns { live: false } when Supabase isn't configured so the page
 * can fall back to demo data.
 */
export async function GET(request: NextRequest) {
  const gameParam = request.nextUrl.searchParams.get('game') ?? 'global';
  if (!(gameParam in GAME_EVENT_TYPES)) {
    return NextResponse.json({ error: 'Unknown game tab' }, { status: 400 });
  }
  const game = gameParam as GameKey;

  const supabase = getSupabase();
  if (!supabase) {
    return NextResponse.json({ live: false, players: [] });
  }

  const [usersRes, eventsRes] = await Promise.all([
    supabase.from('users').select('id, name, role_title, avatar_url'),
    supabase
      .from('events')
      .select('user_id, type, points, created_at')
      .order('created_at', { ascending: false })
      .limit(20000),
  ]);

  if (usersRes.error || eventsRes.error) {
    return NextResponse.json(
      { error: 'Database query failed', live: true, players: [] },
      { status: 500 }
    );
  }

  const standings = buildStandings(
    (usersRes.data ?? []) as UserRow[],
    (eventsRes.data ?? []) as EventRow[],
    game,
    todayUTC()
  ).slice(0, 50);

  return NextResponse.json({ live: true, game, players: standings });
}
