import { NextRequest, NextResponse } from 'next/server';
import { getSupabase, getCurrentUser, todayUTC } from '@/lib/supabase';
import { calculatePoints, type EventType } from '@/lib/points';
import { currentStreak } from '@/lib/stats';

/**
 * Share-to-Slack (design doc 7.2).
 *
 * The web app never talks to Slack or an AI model directly. This route:
 *   1. scores the result into the `events` ledger (once per game per day),
 *   2. records the share in `shares`,
 *   3. enqueues a `share_commentary` job with the player's recent history.
 * The worker box claims the job, calls the model for 1-2 lines of
 * commentary, and posts grid + commentary + streak to #arcade-scores.
 */

const SHAREABLE_GAMES = ['wordle', 'bespokle', 'trivia'] as const;
type ShareableGame = (typeof SHAREABLE_GAMES)[number];

interface ShareBody {
  game: ShareableGame;
  resultSummary: Record<string, unknown>;
  gridText?: string;
}

function num(value: unknown, fallback: number, min: number, max: number): number {
  const n = typeof value === 'number' && Number.isFinite(value) ? value : fallback;
  return Math.min(max, Math.max(min, Math.round(n)));
}

/**
 * Server-side scoring — never trust client-sent points.
 * Returns the event to insert, or null for unscored shares.
 */
function scoreResult(
  game: ShareableGame,
  summary: Record<string, unknown>
): { type: EventType; points: number; payload: Record<string, unknown> } | null {
  switch (game) {
    case 'wordle': {
      const solved = summary.solved === true;
      const guesses = num(summary.guesses, 6, 1, 6);
      const type: EventType = solved ? 'wordle_solve' : 'wordle_fail';
      const { points } = calculatePoints(type, { guesses });
      return { type, points, payload: { solved, guesses } };
    }
    case 'bespokle': {
      const steps = num(summary.steps, 0, 1, 50);
      const par = num(summary.par, 1, 1, 20);
      const stepsOverPar = Math.max(0, steps - par);
      const { points } = calculatePoints('bespokle_solve', {
        steps_over_par: stepsOverPar,
      });
      return {
        type: 'bespokle_solve',
        points,
        payload: { steps, par, steps_over_par: stepsOverPar },
      };
    }
    case 'trivia': {
      // Aggregated daily result: 3 questions × (5 + up to 3 speed bonus).
      const correct = num(summary.correct, 0, 0, 3);
      const speedBonus = num(summary.speedBonus, 0, 0, 9);
      const points = Math.min(24, correct * 5 + speedBonus);
      return {
        type: 'trivia_answer',
        points,
        payload: { correct, total: 3, speed_bonus: speedBonus, aggregated: true },
      };
    }
  }
}

/** Event types that mark a game as "already scored today". */
const SCORED_TYPES: Record<ShareableGame, string[]> = {
  wordle: ['wordle_solve', 'wordle_fail'],
  bespokle: ['bespokle_solve'],
  trivia: ['trivia_answer'],
};

export async function POST(request: NextRequest) {
  let body: ShareBody;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  if (!SHAREABLE_GAMES.includes(body.game)) {
    return NextResponse.json(
      { error: `game must be one of: ${SHAREABLE_GAMES.join(', ')}` },
      { status: 400 }
    );
  }
  const summary =
    body.resultSummary && typeof body.resultSummary === 'object'
      ? body.resultSummary
      : {};

  const supabase = getSupabase();
  if (!supabase) {
    // Demo mode: no database yet — acknowledge so the UI flow still works.
    return NextResponse.json({
      queued: true,
      live: false,
      message: 'Demo mode. Connect Supabase to queue real Slack shares.',
    });
  }

  const user = await getCurrentUser(supabase);
  if (!user) {
    return NextResponse.json({ error: 'Could not resolve user' }, { status: 500 });
  }

  const date = todayUTC();
  const scored = scoreResult(body.game, summary);

  // 1. Score into the events ledger — once per game per day.
  let pointsAwarded = 0;
  let alreadyScored = false;
  if (scored) {
    const { data: todaysEvents } = await supabase
      .from('events')
      .select('id')
      .eq('user_id', user.id)
      .in('type', SCORED_TYPES[body.game])
      .gte('created_at', `${date}T00:00:00Z`)
      .limit(1);

    if (todaysEvents && todaysEvents.length > 0) {
      alreadyScored = true;
    } else {
      const { error } = await supabase.from('events').insert({
        user_id: user.id,
        type: scored.type,
        points: scored.points,
        payload: { ...scored.payload, date, source: 'share' },
      });
      if (!error) pointsAwarded = scored.points;
    }
  }

  // 2. Record the share.
  const { data: share, error: shareError } = await supabase
    .from('shares')
    .insert({
      user_id: user.id,
      game: body.game,
      date,
      result_summary: summary,
    })
    .select('id')
    .single();

  if (shareError || !share) {
    return NextResponse.json(
      { error: 'Failed to record share' },
      { status: 500 }
    );
  }

  // 3. Gather context for the commentator: last 14 days + current streak.
  const since = new Date(Date.now() - 14 * 86400000).toISOString().split('T')[0];
  const [{ data: history }, { data: gameEvents }] = await Promise.all([
    supabase
      .from('shares')
      .select('date, result_summary')
      .eq('user_id', user.id)
      .eq('game', body.game)
      .gte('date', since)
      .neq('id', share.id)
      .order('date', { ascending: false }),
    supabase
      .from('events')
      .select('created_at')
      .eq('user_id', user.id)
      .in('type', SCORED_TYPES[body.game])
      .order('created_at', { ascending: false })
      .limit(365),
  ]);

  const streak = currentStreak(
    (gameEvents ?? []).map((e: { created_at: string }) => e.created_at),
    date
  );

  // 4. Enqueue the commentary job for the worker box.
  const { error: jobError } = await supabase.from('jobs').insert({
    type: 'share_commentary',
    payload: {
      share_id: share.id,
      user_id: user.id,
      user_name: user.name,
      slack_id: user.slack_id,
      game: body.game,
      date,
      result_summary: summary,
      grid_text: typeof body.gridText === 'string' ? body.gridText.slice(0, 2000) : '',
      history: history ?? [],
      streak,
    },
  });

  if (jobError) {
    return NextResponse.json(
      { error: 'Share recorded but job enqueue failed' },
      { status: 500 }
    );
  }

  return NextResponse.json({
    queued: true,
    live: true,
    shareId: share.id,
    pointsAwarded,
    alreadyScored,
    streak,
  });
}
