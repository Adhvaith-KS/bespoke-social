import { NextRequest, NextResponse } from 'next/server';
import { getSupabase, getCurrentUser, todayUTC } from '@/lib/supabase';
import { calculatePoints } from '@/lib/points';
import { initialsOf } from '@/lib/stats';

/**
 * BeReal, AI edition (design doc 7.3).
 *
 * GET  → today's prompt + feed of posts (creates today's bereal_days row
 *        on first visit in live mode — the visit acts as the "ping").
 * POST → upload a photo (client-resized data URL), one per player per day.
 *        Stores to Supabase Storage when available (falls back to inlining
 *        the data URL in image_path), scores a bereal_post event, writes a
 *        placeholder caption, and enqueues a `bereal_caption` vision job
 *        for the worker to replace it with a real one.
 *
 * Slack pings are deferred — the worker owns all Slack posting later.
 */

// Fixed demo prompt for now. The rotation below takes over once the
// backend content pipeline feeds bereal_days rows.
const DEMO_PROMPT =
  'Upload the best picture you took this weekend (and drop the story behind it)';

const PROMPTS = [
  'Show us the oldest thing on your desk.',
  'Your current view, but make it cinematic.',
  'Photograph whatever you would grab first in a fire drill (no laptops).',
  'The most suspicious corner of your workspace.',
  'Your beverage situation, right now, no staging.',
  'Something within arm\'s reach that has a story.',
  'Your workspace from your chair\'s point of view.',
];

function promptForDate(date: string): string {
  void PROMPTS; // rotation reserved for the backend era
  void date;
  return DEMO_PROMPT;
}

// Placeholder captions until the worker's vision job writes a real one
const CAPTION_TEMPLATES = [
  'The AI captioner is on its way. Early reports say this photo has excellent vibes.',
  'Caption pending, but the composition alone is already winning awards in my heart.',
  'A vision model is warming up to say something clever about this. Stand by.',
];

function placeholderCaption(onTime: boolean): string {
  const base =
    CAPTION_TEMPLATES[Math.floor(Math.random() * CAPTION_TEMPLATES.length)];
  return onTime ? base : `Fashionably late, but here. ${base}`;
}

const STORAGE_BUCKET = 'bereal';
const MAX_DATA_URL_LENGTH = 2_500_000; // ~1.8MB image after base64
const MAX_CAPTION_LENGTH = 140;

interface FeedPost {
  id: string;
  userName: string;
  initials: string;
  imageUrl: string;
  caption: string | null;
  onTime: boolean;
  postedAt: string;
}

async function ensureToday(supabase: NonNullable<ReturnType<typeof getSupabase>>, date: string) {
  const { data: day } = await supabase
    .from('bereal_days')
    .select('date, prompt_text, ping_time_us, ping_time_in')
    .eq('date', date)
    .maybeSingle();
  if (day) return day;

  // First visitor of the day triggers the "ping" — its timestamp anchors
  // the 30-minute on-time window until real scheduled pings exist.
  const now = new Date().toISOString();
  const { data: created } = await supabase
    .from('bereal_days')
    .insert({
      date,
      prompt_text: promptForDate(date),
      ping_time_us: now,
      ping_time_in: now,
    })
    .select('date, prompt_text, ping_time_us, ping_time_in')
    .single();
  return created;
}

async function resolveImageUrl(
  supabase: NonNullable<ReturnType<typeof getSupabase>>,
  imagePath: string
): Promise<string> {
  if (imagePath.startsWith('data:')) return imagePath;
  const { data } = await supabase.storage
    .from(STORAGE_BUCKET)
    .createSignedUrl(imagePath, 60 * 60 * 24);
  return data?.signedUrl ?? '';
}

export async function GET() {
  const date = todayUTC();
  const supabase = getSupabase();

  if (!supabase) {
    return NextResponse.json({
      live: false,
      date,
      prompt: promptForDate(date),
      posts: [] as FeedPost[],
    });
  }

  const day = await ensureToday(supabase, date);
  const { data: posts } = await supabase
    .from('bereal_posts')
    .select('id, image_path, posted_at, on_time, ai_caption, users(name)')
    .eq('date', date)
    .order('posted_at', { ascending: false });

  const feed: FeedPost[] = await Promise.all(
    (posts ?? []).map(async (p) => {
      const userRel = p.users as unknown as { name: string } | { name: string }[] | null;
      const name = Array.isArray(userRel)
        ? userRel[0]?.name ?? 'Someone'
        : userRel?.name ?? 'Someone';
      return {
        id: p.id,
        userName: name,
        initials: initialsOf(name),
        imageUrl: await resolveImageUrl(supabase, p.image_path),
        caption: p.ai_caption,
        onTime: p.on_time,
        postedAt: p.posted_at,
      };
    })
  );

  return NextResponse.json({
    live: true,
    date,
    prompt: day?.prompt_text ?? promptForDate(date),
    posts: feed,
  });
}

export async function POST(request: NextRequest) {
  let body: { imageDataUrl?: string; caption?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const dataUrl = body.imageDataUrl;
  const userCaption =
    typeof body.caption === 'string'
      ? body.caption.trim().slice(0, MAX_CAPTION_LENGTH)
      : '';
  if (
    typeof dataUrl !== 'string' ||
    !dataUrl.startsWith('data:image/') ||
    dataUrl.length > MAX_DATA_URL_LENGTH
  ) {
    return NextResponse.json(
      { error: 'Send imageDataUrl (data:image/..., max ~1.8MB after resize)' },
      { status: 400 }
    );
  }

  const date = todayUTC();
  const supabase = getSupabase();

  if (!supabase) {
    return NextResponse.json({
      live: false,
      post: {
        id: `demo-${Math.random().toString(36).slice(2)}`,
        userName: 'Demo Player',
        initials: 'DP',
        imageUrl: dataUrl,
        caption: placeholderCaption(true),
        onTime: true,
        postedAt: new Date().toISOString(),
      },
      pointsAwarded: 0,
      message: 'Demo mode. Connect Supabase to save posts.',
    });
  }

  const user = await getCurrentUser(supabase);
  if (!user) {
    return NextResponse.json({ error: 'Could not resolve user' }, { status: 500 });
  }

  const day = await ensureToday(supabase, date);

  const { data: existing } = await supabase
    .from('bereal_posts')
    .select('id')
    .eq('date', date)
    .eq('user_id', user.id)
    .maybeSingle();
  if (existing) {
    return NextResponse.json(
      { error: 'You already posted today. One per day!' },
      { status: 409 }
    );
  }

  // No time window — posting any time on the day counts in full
  const onTime = true;

  // Prefer Supabase Storage; fall back to inlining the data URL
  let imagePath = dataUrl;
  try {
    const base64 = dataUrl.split(',')[1];
    const mime = dataUrl.slice(5, dataUrl.indexOf(';'));
    const ext = mime.split('/')[1]?.split('+')[0] || 'jpg';
    const path = `${date}/${user.id}.${ext}`;
    const { error: uploadError } = await supabase.storage
      .from(STORAGE_BUCKET)
      .upload(path, Buffer.from(base64, 'base64'), {
        contentType: mime,
        upsert: true,
      });
    if (!uploadError) imagePath = path;
  } catch {
    // keep data URL fallback
  }

  // The player's own caption leads. Until the schema grows a
  // user_caption column, it lives in ai_caption.
  const caption = userCaption || placeholderCaption(onTime);
  const { data: post, error: postError } = await supabase
    .from('bereal_posts')
    .insert({
      user_id: user.id,
      date,
      image_path: imagePath,
      on_time: onTime,
      ai_caption: caption,
    })
    .select('id, posted_at')
    .single();

  if (postError || !post) {
    return NextResponse.json({ error: 'Failed to save post' }, { status: 500 });
  }

  const { points } = calculatePoints('bereal_post', { on_time: onTime });
  await supabase.from('events').insert({
    user_id: user.id,
    type: 'bereal_post',
    points,
    payload: { date, on_time: onTime, post_id: post.id },
  });

  // Vision job: the worker replaces the placeholder caption
  await supabase.from('jobs').insert({
    type: 'bereal_caption',
    payload: {
      post_id: post.id,
      image_path: imagePath.startsWith('data:') ? '(inline data url)' : imagePath,
      prompt: day?.prompt_text ?? promptForDate(date),
      on_time: onTime,
      user_name: user.name,
    },
  });

  return NextResponse.json({
    live: true,
    post: {
      id: post.id,
      userName: user.name,
      initials: initialsOf(user.name),
      imageUrl: dataUrl,
      caption,
      onTime,
      postedAt: post.posted_at,
    },
    pointsAwarded: points,
  });
}
