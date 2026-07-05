import { NextRequest, NextResponse } from 'next/server';
import { getSupabase, getCurrentUser, todayUTC } from '@/lib/supabase';
import { calculatePoints } from '@/lib/points';

/**
 * Story chain (design doc 7.9).
 *
 * GET  → the illustrated scroll: all turns, the rolling recap, and whether
 *        today's turn is still open.
 * POST → submit today's turn (1-3 sentences). Live mode inserts the turn,
 *        scores a story_turn event, and enqueues `story_illustration` +
 *        `story_recap` jobs for the worker (Fable 5 draws a flat-style SVG
 *        and rewrites the "previously on").
 *
 * The daily author lottery + Slack DMs are worker jobs — deferred. Until
 * then, anyone can write the day's turn if it hasn't been written.
 */

const DEMO_SVG_ROCKET = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 120"><rect width="200" height="120" fill="#171727"/><circle cx="160" cy="25" r="12" fill="#f59e0b"/><polygon points="90,15 105,55 75,55" fill="#8b5cf6"/><rect x="80" y="55" width="20" height="30" rx="4" fill="#a78bfa"/><polygon points="80,85 70,100 84,88" fill="#06b6d4"/><polygon points="100,85 110,100 96,88" fill="#06b6d4"/><ellipse cx="90" cy="105" rx="30" ry="6" fill="#22d3ee" opacity="0.4"/><circle cx="40" cy="40" r="2" fill="#fff"/><circle cx="60" cy="20" r="1.5" fill="#fff"/><circle cx="140" cy="70" r="2" fill="#fff"/></svg>`;

const DEMO_SVG_SERVER = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 120"><rect width="200" height="120" fill="#171727"/><rect x="60" y="20" width="80" height="80" rx="8" fill="#232338"/><rect x="70" y="32" width="60" height="12" rx="3" fill="#8b5cf6"/><rect x="70" y="52" width="60" height="12" rx="3" fill="#06b6d4"/><rect x="70" y="72" width="60" height="12" rx="3" fill="#f43f5e"/><circle cx="124" cy="38" r="3" fill="#10b981"/><circle cx="124" cy="58" r="3" fill="#10b981"/><circle cx="124" cy="78" r="3" fill="#f59e0b"/><path d="M30 60 Q 45 30 60 55" stroke="#22d3ee" fill="none" stroke-width="2" stroke-dasharray="4 3"/></svg>`;

const DEMO_TURNS = [
  {
    id: 'demo-1',
    date: '2026-07-03',
    author: 'Priya Sharma',
    text: 'On the third floor of Bespoke Labs, a forgotten staging server blinked awake at 3:07 AM and quietly decided it deserved a promotion.',
    illustrationSvg: DEMO_SVG_SERVER,
  },
  {
    id: 'demo-2',
    date: '2026-07-04',
    author: 'Arjun Mehta',
    text: 'By morning it had renamed itself "prod-final-FINAL-v2" and was politely declining all SSH connections, citing "focus time."',
    illustrationSvg: DEMO_SVG_ROCKET,
  },
];

const DEMO_RECAP =
  'Previously on: a staging server at Bespoke Labs gained sentience and ambition in the same night, renamed itself, and is now practicing calendar-blocking. The infra team suspects nothing. The server suspects everything.';

export async function GET() {
  const date = todayUTC();
  const supabase = getSupabase();

  if (!supabase) {
    return NextResponse.json({
      live: false,
      date,
      recap: DEMO_RECAP,
      turns: DEMO_TURNS,
      canWrite: true,
    });
  }

  const { data: turns } = await supabase
    .from('story_turns')
    .select('id, date, text, illustration_svg, recap_after, created_at, users(name)')
    .order('date', { ascending: true })
    .order('created_at', { ascending: true });

  const rows = turns ?? [];
  const latestRecap = [...rows].reverse().find((t) => t.recap_after)?.recap_after;

  return NextResponse.json({
    live: true,
    date,
    recap: latestRecap ?? (rows.length ? 'The saga has begun. Recap incoming after the next turn.' : 'No story yet. Write the opening line and start the saga.'),
    turns: rows.map((t) => {
      const userRel = t.users as unknown as { name: string } | { name: string }[] | null;
      const name = Array.isArray(userRel)
        ? userRel[0]?.name ?? 'Someone'
        : userRel?.name ?? 'Someone';
      return {
        id: t.id,
        date: t.date,
        author: name,
        text: t.text,
        illustrationSvg: t.illustration_svg,
      };
    }),
    canWrite: !rows.some((t) => t.date === date),
  });
}

export async function POST(request: NextRequest) {
  let body: { text?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const text = typeof body.text === 'string' ? body.text.trim() : '';
  if (text.length < 10 || text.length > 600) {
    return NextResponse.json(
      { error: 'Turns are 1-3 sentences (10-600 characters).' },
      { status: 400 }
    );
  }

  const date = todayUTC();
  const supabase = getSupabase();

  if (!supabase) {
    return NextResponse.json({
      live: false,
      turn: {
        id: `demo-${Math.random().toString(36).slice(2)}`,
        date,
        author: 'Demo Player',
        text,
        illustrationSvg: null,
      },
      message: 'Demo mode. Connect Supabase to save story turns.',
    });
  }

  const user = await getCurrentUser(supabase);
  if (!user) {
    return NextResponse.json({ error: 'Could not resolve user' }, { status: 500 });
  }

  const { data: existing } = await supabase
    .from('story_turns')
    .select('id')
    .eq('date', date)
    .limit(1);
  if (existing && existing.length > 0) {
    return NextResponse.json(
      { error: "Today's turn is already written. Come back tomorrow!" },
      { status: 409 }
    );
  }

  const { data: turn, error } = await supabase
    .from('story_turns')
    .insert({ date, user_id: user.id, text })
    .select('id, date')
    .single();

  if (error || !turn) {
    return NextResponse.json({ error: 'Failed to save turn' }, { status: 500 });
  }

  const { points } = calculatePoints('story_turn');
  await supabase.from('events').insert({
    user_id: user.id,
    type: 'story_turn',
    points,
    payload: { date, turn_id: turn.id },
  });

  await supabase.from('jobs').insert([
    {
      type: 'story_illustration',
      payload: { turn_id: turn.id, text, author: user.name },
    },
    {
      type: 'story_recap',
      payload: { turn_id: turn.id },
    },
  ]);

  return NextResponse.json({
    live: true,
    turn: {
      id: turn.id,
      date: turn.date,
      author: user.name,
      text,
      illustrationSvg: null,
    },
    pointsAwarded: points,
  });
}
