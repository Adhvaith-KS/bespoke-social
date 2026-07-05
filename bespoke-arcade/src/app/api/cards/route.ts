import { NextRequest, NextResponse } from 'next/server';
import { getSupabase, getCurrentUser, todayUTC } from '@/lib/supabase';
import { calculatePoints } from '@/lib/points';
import { initialsOf } from '@/lib/stats';

/**
 * Coffee chat cards (design doc 7.11).
 *
 * GET  → your collection + the colleague roster (for silhouettes and the
 *        mint form).
 * POST → "I met someone": mint a card for a colleague with 1-2 lines about
 *        them. Live mode inserts the card (unconfirmed), scores a
 *        card_minted event, and enqueues a `card_flavor` job — the worker
 *        turns your lines + their profile into flavor text. The subject's
 *        confirm step happens over Slack DM, which is deferred, so cards
 *        show as "pending confirmation" until the bot exists.
 */

interface CardView {
  id: string;
  subjectName: string;
  initials: string;
  role: string;
  flavorText: string | null;
  metOn: string | null;
  confirmed: boolean;
}

const DEMO_CARDS: CardView[] = [
  {
    id: 'demo-1',
    subjectName: 'Priya Sharma',
    initials: 'PS',
    role: 'ML Engineer',
    flavorText:
      'Explains transformers with coffee cups and napkins. The napkins understand transformers now.',
    metOn: '2026-07-02',
    confirmed: true,
  },
  {
    id: 'demo-2',
    subjectName: 'Ravi Kumar',
    initials: 'RK',
    role: 'DevOps Lead',
    flavorText:
      'Has never seen a pager alert he could not calm down with one deep breath and three terminal tabs.',
    metOn: '2026-07-04',
    confirmed: true,
  },
];

const DEMO_COLLEAGUES = [
  { id: 'c1', name: 'Priya Sharma' },
  { id: 'c2', name: 'Arjun Mehta' },
  { id: 'c3', name: 'Sarah Chen' },
  { id: 'c4', name: 'Mahesh Iyer' },
  { id: 'c5', name: 'Emily Wang' },
  { id: 'c6', name: 'Ravi Kumar' },
];

export async function GET() {
  const supabase = getSupabase();

  if (!supabase) {
    return NextResponse.json({
      live: false,
      cards: DEMO_CARDS,
      colleagues: DEMO_COLLEAGUES,
      collectedSubjectIds: ['c1', 'c6'],
    });
  }

  const user = await getCurrentUser(supabase);
  if (!user) {
    return NextResponse.json({ error: 'Could not resolve user' }, { status: 500 });
  }

  const [usersRes, cardsRes] = await Promise.all([
    supabase.from('users').select('id, name, role_title').neq('id', user.id),
    supabase
      .from('cards')
      .select(
        'id, subject_id, flavor_text, subject_role, met_on, confirmed_by_subject, users!cards_subject_id_fkey(name)'
      )
      .eq('owner_id', user.id)
      .order('created_at', { ascending: false }),
  ]);

  const cards: CardView[] = (cardsRes.data ?? []).map((c) => {
    const userRel = c.users as unknown as { name: string } | { name: string }[] | null;
    const name = Array.isArray(userRel)
      ? userRel[0]?.name ?? 'Colleague'
      : userRel?.name ?? 'Colleague';
    return {
      id: c.id,
      subjectName: name,
      initials: initialsOf(name),
      role: c.subject_role ?? 'Bespoke Labs',
      flavorText: c.flavor_text,
      metOn: c.met_on,
      confirmed: c.confirmed_by_subject,
    };
  });

  return NextResponse.json({
    live: true,
    cards,
    colleagues: (usersRes.data ?? []).map((u) => ({ id: u.id, name: u.name })),
    collectedSubjectIds: (cardsRes.data ?? []).map((c) => c.subject_id),
  });
}

export async function POST(request: NextRequest) {
  let body: { subjectId?: string; lines?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const lines = typeof body.lines === 'string' ? body.lines.trim() : '';
  if (!body.subjectId || lines.length < 10 || lines.length > 400) {
    return NextResponse.json(
      { error: 'Pick a colleague and write 1-2 lines (10-400 characters).' },
      { status: 400 }
    );
  }

  const supabase = getSupabase();
  if (!supabase) {
    return NextResponse.json({
      live: false,
      card: {
        id: `demo-${Math.random().toString(36).slice(2)}`,
        subjectName:
          DEMO_COLLEAGUES.find((c) => c.id === body.subjectId)?.name ??
          'Colleague',
        initials: 'CC',
        role: 'Bespoke Labs',
        flavorText: lines,
        metOn: todayUTC(),
        confirmed: false,
      },
      message: 'Demo mode. Connect Supabase to mint real cards.',
    });
  }

  const user = await getCurrentUser(supabase);
  if (!user) {
    return NextResponse.json({ error: 'Could not resolve user' }, { status: 500 });
  }
  if (body.subjectId === user.id) {
    return NextResponse.json(
      { error: 'Meeting yourself is good self-care but not card-worthy.' },
      { status: 400 }
    );
  }

  const { data: subject } = await supabase
    .from('users')
    .select('id, name, role_title')
    .eq('id', body.subjectId)
    .maybeSingle();
  if (!subject) {
    return NextResponse.json({ error: 'Colleague not found' }, { status: 404 });
  }

  const { data: existing } = await supabase
    .from('cards')
    .select('id')
    .eq('owner_id', user.id)
    .eq('subject_id', subject.id)
    .maybeSingle();
  if (existing) {
    return NextResponse.json(
      { error: `You already have ${subject.name}'s card in your collection.` },
      { status: 409 }
    );
  }

  const metOn = todayUTC();
  // Writer's raw lines are the placeholder flavor until the worker's
  // card_flavor job rewrites them (guardrail: it may only use these lines
  // + public profile fields).
  const { data: card, error } = await supabase
    .from('cards')
    .insert({
      owner_id: user.id,
      subject_id: subject.id,
      flavor_text: lines,
      subject_role: subject.role_title,
      met_on: metOn,
    })
    .select('id')
    .single();

  if (error || !card) {
    return NextResponse.json({ error: 'Failed to mint card' }, { status: 500 });
  }

  // Schema's events CHECK uses 'card_minted'; points follow the writer rate.
  const { points } = calculatePoints('card_minted_writer');
  await supabase.from('events').insert({
    user_id: user.id,
    type: 'card_minted',
    points,
    payload: { card_id: card.id, subject_id: subject.id, role: 'writer' },
  });

  await supabase.from('jobs').insert({
    type: 'card_flavor',
    payload: {
      card_id: card.id,
      writer_lines: lines,
      subject_name: subject.name,
      subject_role: subject.role_title,
    },
  });

  return NextResponse.json({
    live: true,
    card: {
      id: card.id,
      subjectName: subject.name,
      initials: initialsOf(subject.name),
      role: subject.role_title ?? 'Bespoke Labs',
      flavorText: lines,
      metOn,
      confirmed: false,
    },
    pointsAwarded: points,
  });
}
