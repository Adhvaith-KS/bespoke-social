/**
 * The Bespoke Arcade — job queue worker (design doc section 3).
 *
 * Runs on the always-on worker box. Polls the `jobs` table, claims one
 * pending job at a time, runs its handler, writes results back, and marks
 * the job done/failed. No Redis, no extra infra.
 *
 * AI calls: when USE_CLAUDE_CLI=1 the worker shells out to `claude -p`
 * (Max-plan auth, no API key). Otherwise every handler falls back to
 * canned output so a missing/rate-limited CLI never blocks the daily
 * cycle (design doc section 2, fallbacks).
 *
 * ⚠️ SLACK POSTING IS DEFERRED (team decision 2026-07-05): postToSlack()
 * below is a logged no-op. When the Slack app is installed, implement it
 * with chat.postMessage using SLACK_BOT_TOKEN and the channel env vars.
 *
 * Usage (from repo root, uses the root node_modules):
 *   node worker/index.mjs
 */

import { createClient } from '@supabase/supabase-js';
import { execFile } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

// ---------------------------------------------------------------------------
// Env: load .env.local from the repo root (plain Node, no dotenv dependency)
// ---------------------------------------------------------------------------
const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
try {
  const envFile = readFileSync(resolve(ROOT, '.env.local'), 'utf8');
  for (const line of envFile.split('\n')) {
    const match = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
    if (match && !(match[1] in process.env)) {
      process.env[match[1]] = match[2].replace(/^["']|["']$/g, '');
    }
  }
} catch {
  // no .env.local — rely on the process environment
}

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_KEY =
  process.env.SUPABASE_SERVICE_ROLE_KEY ||
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error(
    '[worker] Missing NEXT_PUBLIC_SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY — set them in .env.local'
  );
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY, {
  auth: { persistSession: false },
});

const POLL_INTERVAL_MS = 3000;
const USE_CLAUDE_CLI = process.env.USE_CLAUDE_CLI === '1';

// ---------------------------------------------------------------------------
// AI helper: claude CLI with canned fallback
// ---------------------------------------------------------------------------
function callClaude(prompt, timeoutMs = 120_000) {
  return new Promise((resolvePromise) => {
    execFile(
      'claude',
      ['-p', prompt, '--output-format', 'json'],
      { timeout: timeoutMs, shell: process.platform === 'win32', maxBuffer: 10_000_000 },
      (error, stdout) => {
        if (error) {
          console.warn('[worker] claude CLI failed, using fallback:', error.message);
          resolvePromise(null);
          return;
        }
        try {
          const parsed = JSON.parse(stdout);
          resolvePromise(
            typeof parsed.result === 'string' ? parsed.result.trim() : null
          );
        } catch {
          resolvePromise(stdout.trim() || null);
        }
      }
    );
  });
}

async function aiText(prompt, fallback) {
  if (USE_CLAUDE_CLI) {
    const result = await callClaude(prompt);
    if (result) return result;
  }
  return fallback;
}

// ---------------------------------------------------------------------------
// Slack: DEFERRED — logged no-op until the Slack app is installed
// ---------------------------------------------------------------------------
async function postToSlack(channel, text) {
  // TODO(slack): implement with chat.postMessage once SLACK_BOT_TOKEN exists.
  console.log(`[worker] (slack disabled) would post to ${channel}:\n${text}\n`);
  return null; // would return the message ts
}

// ---------------------------------------------------------------------------
// Persona (design doc 7.10) — Baabbage, the robotic goat Culture Overlord.
// Defined in src/components/Mascot.tsx for the UI; keep the two in sync.
// ---------------------------------------------------------------------------
const PERSONA = `You are Baabbage, a robotic goat and the self-appointed
Culture Overlord of Bespoke Social, the culture app of Bespoke Labs. You
live inside the app and the company Slack, and your one job is making sure
everyone has fun. You take office games far too seriously.
Voice: playful roast, specific, never cruel, never punching down. Never
comment on appearance, homes, religion, or anything a person did not choose
to share. Never reveal the answers to today's puzzles. House style: no
quotation marks, no semicolons, and no em dashes in anything you write.`;

// ---------------------------------------------------------------------------
// Job handlers
// ---------------------------------------------------------------------------
const handlers = {
  /** Share commentary (design doc 7.2) → shares.commentary_text + Slack. */
  async share_commentary(payload) {
    const { share_id, user_name, game, result_summary, grid_text, history, streak } = payload;

    const fallbacks = [
      `${user_name} posts a ${game} result and the leaderboard shudders politely. Streak: ${streak} day${streak === 1 ? '' : 's'} and counting.`,
      `Another day, another ${game} entry from ${user_name}. The Desk has seen worse. The Desk has also seen better, but we're contractually playful.`,
      `${user_name} logs a ${game} result${streak >= 3 ? ` — that's ${streak} straight days. Someone check on their calendar.` : '. The grind continues.'}`,
    ];
    const fallback = fallbacks[Math.floor(Math.random() * fallbacks.length)];

    const commentary = await aiText(
      `${PERSONA}

Write 1-2 lines of commentary about this player's game result, in context of
their recent history. Output only the commentary, no quotes.

Player: ${user_name}
Game: ${game}
Today's result: ${JSON.stringify(result_summary)}
Current streak: ${streak} days
Last 14 days: ${JSON.stringify(history)}`,
      fallback
    );

    await supabase
      .from('shares')
      .update({ commentary_text: commentary })
      .eq('id', share_id);

    const slackTs = await postToSlack(
      process.env.SLACK_CHANNEL_SCORES || '#arcade-scores',
      `${grid_text}\n\n_${commentary}_\n🔥 ${streak}-day streak`
    );
    if (slackTs) {
      await supabase.from('shares').update({ slack_ts: slackTs }).eq('id', share_id);
    }
    return { commentary };
  },

  /** BeReal caption (design doc 7.3) → bereal_posts.ai_caption. */
  async bereal_caption(payload) {
    const { post_id, prompt, on_time, user_name, image_path } = payload;

    const fallback = on_time
      ? `Answered "${prompt}" with zero hesitation. The Desk respects the commitment.`
      : `Posted late, but the subject clearly waited patiently. Better late than staged.`;

    // Vision needs a real file path for the CLI; inline data URLs skip AI.
    const canUseVision =
      USE_CLAUDE_CLI && image_path && !image_path.includes('inline');
    const caption = canUseVision
      ? await aiText(
          `${PERSONA}

A player posted a photo for today's BeReal challenge: "${prompt}".
Player: ${user_name}. On time: ${on_time}.
Write one playful caption line. Comment only on what the challenge invited —
never on faces, bodies, or anything identifying about someone's home.
(Image at storage path: ${image_path} — describe in general terms if unreadable.)`,
          fallback
        )
      : fallback;

    await supabase
      .from('bereal_posts')
      .update({ ai_caption: caption })
      .eq('id', post_id);
    return { caption };
  },

  /** Story illustration (design doc 7.9) → story_turns.illustration_svg. */
  async story_illustration(payload) {
    const { turn_id, text } = payload;

    // Fallback: a flat-style generative SVG seeded by the turn text
    const hue = [...text].reduce((h, c) => (h * 31 + c.charCodeAt(0)) % 360, 7);
    const fallbackSvg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 120"><rect width="200" height="120" fill="#171727"/><circle cx="${40 + (hue % 120)}" cy="35" r="18" fill="hsl(${hue},70%,60%)"/><rect x="${30 + (hue % 60)}" y="60" width="70" height="34" rx="8" fill="hsl(${(hue + 120) % 360},60%,55%)"/><polygon points="150,90 170,50 190,90" fill="hsl(${(hue + 240) % 360},65%,58%)"/><circle cx="30" cy="20" r="2" fill="#fff"/><circle cx="180" cy="25" r="1.5" fill="#fff"/></svg>`;

    const svg = await aiText(
      `Generate a single flat-style SVG illustration (viewBox="0 0 200 120",
dark background #171727, simple geometric shapes, colors from
#8b5cf6/#06b6d4/#f59e0b/#10b981/#f43f5e) depicting this story moment:
"${text}"
Output ONLY the <svg>...</svg> markup, nothing else.`,
      fallbackSvg
    );

    const cleaned = svg.startsWith('<svg') ? svg : fallbackSvg;
    await supabase
      .from('story_turns')
      .update({ illustration_svg: cleaned })
      .eq('id', turn_id);
    return { svg: cleaned.slice(0, 80) + '…' };
  },

  /** Story recap (design doc 7.9) → story_turns.recap_after. */
  async story_recap(payload) {
    const { turn_id } = payload;
    const { data: turns } = await supabase
      .from('story_turns')
      .select('text')
      .order('date', { ascending: true });

    const allText = (turns ?? []).map((t) => t.text).join(' ');
    const fallback = `Previously on: ${allText.slice(0, 400)}${
      allText.length > 400 ? '…' : ''
    }`;

    const recap = await aiText(
      `${PERSONA}

Rewrite this ongoing office saga as a "previously on" recap, max 120 words,
dramatic TV-announcer energy. Output only the recap.

The story so far:
${allText}`,
      fallback
    );

    await supabase
      .from('story_turns')
      .update({ recap_after: recap })
      .eq('id', turn_id);
    return { recap: recap.slice(0, 80) + '…' };
  },

  /** Card flavor text (design doc 7.11) → cards.flavor_text. */
  async card_flavor(payload) {
    const { card_id, writer_lines, subject_name, subject_role } = payload;

    const fallback = writer_lines; // the writer's own words are a fine card

    const flavor = await aiText(
      `${PERSONA}

Turn these coffee-chat notes into 1-2 lines of collectible-card flavor text.
GUARDRAIL: use ONLY what the writer submitted plus the public role —
invent nothing about the person.

Subject: ${subject_name} (${subject_role ?? 'Bespoke Labs'})
Writer's notes: "${writer_lines}"
Output only the flavor text.`,
      fallback
    );

    await supabase.from('cards').update({ flavor_text: flavor }).eq('id', card_id);
    return { flavor };
  },
};

// ---------------------------------------------------------------------------
// Queue loop: claim → run → complete/fail
// ---------------------------------------------------------------------------
async function claimNextJob() {
  const { data: candidates } = await supabase
    .from('jobs')
    .select('id, type, payload')
    .eq('status', 'pending')
    .lte('run_after', new Date().toISOString())
    .order('created_at', { ascending: true })
    .limit(1);

  const job = candidates?.[0];
  if (!job) return null;

  // Optimistic claim — only wins if it's still pending
  const { data: claimed } = await supabase
    .from('jobs')
    .update({ status: 'running', started_at: new Date().toISOString() })
    .eq('id', job.id)
    .eq('status', 'pending')
    .select('id');

  return claimed && claimed.length > 0 ? job : null;
}

async function runOnce() {
  const job = await claimNextJob();
  if (!job) return false;

  console.log(`[worker] running job ${job.id} (${job.type})`);
  const handler = handlers[job.type];

  try {
    if (!handler) throw new Error(`No handler for job type "${job.type}"`);
    const result = await handler(job.payload ?? {});
    await supabase
      .from('jobs')
      .update({
        status: 'done',
        result,
        completed_at: new Date().toISOString(),
      })
      .eq('id', job.id);
    console.log(`[worker] done: ${job.id}`);
  } catch (error) {
    console.error(`[worker] failed: ${job.id}`, error.message);
    await supabase
      .from('jobs')
      .update({
        status: 'failed',
        error: String(error.message ?? error),
        completed_at: new Date().toISOString(),
      })
      .eq('id', job.id);
  }
  return true;
}

async function main() {
  console.log(
    `[worker] Bespoke Arcade worker up. CLI mode: ${
      USE_CLAUDE_CLI ? 'claude -p' : 'canned fallbacks'
    }. Slack: disabled (deferred). Polling every ${POLL_INTERVAL_MS / 1000}s…`
  );
  for (;;) {
    try {
      const didWork = await runOnce();
      if (!didWork) {
        await new Promise((r) => setTimeout(r, POLL_INTERVAL_MS));
      }
    } catch (error) {
      console.error('[worker] loop error:', error.message);
      await new Promise((r) => setTimeout(r, POLL_INTERVAL_MS * 2));
    }
  }
}

main();
