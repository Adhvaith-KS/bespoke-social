# The Bespoke Arcade — Claude Code Context & Handoff

Welcome to **The Bespoke Arcade** repository! This document provides complete architectural context, established design patterns, progress tracking, and development guidelines for assisting the developer.

---

## 🛠 Project Overview & Architecture

**The Bespoke Arcade** is a self-running culture and AI game app for Bespoke Labs, designed to run autonomously via AI models and worker jobs.

### Technology Stack
- **Framework**: Next.js 16.2.10 (App Router) with TypeScript
- **Styling**: Vanilla CSS with CSS Variables / Design Tokens (No Tailwind CSS unless requested)
- **Database / Backend**: Supabase (PostgreSQL schema created in `supabase/migrations/001_initial_schema.sql`)
- **Package Manager**: npm (`npm run dev`, `npm run build`)

### Directory Structure
```
bespoke-arcade/
├── src/
│   ├── app/              # Next.js App Router pages & API routes
│   │   ├── api/wordle/   # Wordle API (guess validation + reveal)
│   │   ├── api/bespokle/ # Bespokle API (step validation + puzzle)
│   │   ├── api/trivia/   # Trivia API (question delivery + speed bonus scoring)
│   │   ├── api/share/    # Share-to-Slack: events scoring + jobs enqueue
│   │   ├── api/leaderboard/ # Live standings derived from events
│   │   ├── api/me/       # Profile stats + opt-in persistence
│   │   ├── api/bereal/   # BeReal upload, feed, caption job enqueue
│   │   ├── api/story/    # Story chain turns + illustration/recap jobs
│   │   ├── api/cards/    # Coffee chat card collection + minting
│   │   ├── wordle/       # Wordle game UI & logic
│   │   ├── bespokle/     # Bespokle word ladder game UI & logic
│   │   ├── trivia/       # Company Trivia game UI & logic
│   │   ├── ttal/         # Two Truths and a Lie voting UI
│   │   ├── bereal/       # BeReal upload + AI-captioned feed
│   │   ├── story/        # Illustrated story chain scroll
│   │   ├── cards/        # Coffee chat card collection
│   │   ├── digest/       # Friday digest archive (sample issue)
│   │   ├── me/           # User Profile page (stats, streaks, badges, opt-ins)
│   │   ├── leaderboard/  # Real-time leaderboard with game tabs & AI commentary
│   │   ├── layout.tsx    # Root layout with responsive glassmorphism Nav
│   │   ├── page.tsx      # Home dashboard & feature grid
│   │   └── globals.css   # Full Dark Arcade design system & animations
│   ├── components/
│   │   ├── Nav.tsx       # Glassmorphism header & mobile navigation
│   │   ├── Nav.module.css
│   │   ├── ShareToSlack.tsx        # Reusable share button (Wordle/Bespokle/Trivia)
│   │   └── ShareToSlack.module.css
│   └── lib/
│       ├── points.ts            # Single source of truth for point calculation rules
│       ├── wordle-dictionary.ts # 800+ word dictionary & server-side guess evaluator
│       ├── ladder-solver.ts     # BFS word ladder solver (~1200 4-letter words)
│       ├── supabase.ts          # Server-side Supabase client + demo-mode detection
│       └── stats.ts             # Pure streak/standings aggregation from events
├── supabase/
│   └── migrations/001_initial_schema.sql  # Complete Postgres schema (16+ tables & views)
├── worker/               # index.mjs — jobs poller (npm run worker); Slack posting stubbed
├── agent/                # (Stubs) Automated admin agent scripts
├── content/              # (Stubs) Daily AI-generated content storage
├── scripts/              # Utility & deployment scripts
└── .env.example          # Template for Supabase, Slack, and App env vars
```

---

## 🎨 Design System & Aesthetic Rules

**"Warm Newspaper Arcade"** — a paper-and-ink, neo-brutalist light theme (redesigned 2026-07-06, direction adapted from a teammate's prototype in `../shreyapp`). The old CSS variable NAMES were kept and their VALUES swapped, so module CSS mostly styles itself from tokens.

1. **Paper & Ink**: Cream surfaces (`--bg-primary` #fbf7ef paper, `--bg-secondary` #f4ecd9, `--bg-card` #fffdf8 panel), 1px solid ink borders (`--ink` #181713) on cards/buttons/tiles, `--line` #d8cdbb for hairline dividers.
2. **Accents**: red `--accent-rose` #e24a3b (primary buttons), teal `--accent-cyan` #009a9a, gold `--accent-gold` #e0a12b (avatars/coins/present tiles), green `--accent-emerald` #21a56d (correct tiles), blue `--accent-blue` #315fba (eyebrows/links), violet `--accent-purple` #7251b5.
3. **Shadows**: hard "stamp" offsets — `--shadow-hard` (4px 4px 0 ink, used on active nav + reveal tiles) and `--shadow-stamp` (6px 6px 0 soft ink, on cards). The old `--shadow-glow-*` vars now alias soft stamps. No glassmorphism/blur glows.
4. **Typography**: **Georgia serif** (`--font-display`) for giant tight-leading headlines (page titles are solid ink — no gradient text), **Inter** for body/UI at weights 600-900.
5. **Layout**: left sidebar rail (`<Nav />` = 248px sticky aside: ink brand block with gold coin mark, stacked nav with ink-border+stamp active state, yellow sticky-note, sign-out). `.appShell` flex in globals.css; rail collapses to a top grid ≤980px.
6. **Micro-animations kept**: tile flips, spring reveals (BES stamp = red tiles + teal POKE + gold glow on paper overlay), confetti, shakes, staggered entrances.

## 🔐 Auth (Google, compulsory)

- Sign-in with Google via Supabase Auth, **restricted to @bespokelabs.ai** — enforced server-side in `src/middleware.ts` (gates every page + API; wrong-domain sessions are signed out) and in `src/app/auth/callback/route.ts`. The `hd` hint on the picker is cosmetic only.
- Pieces: `/login` (paper-styled card), `/auth/callback`, `/auth/signout` (POST), `src/lib/auth.ts` (`getAuthedIdentity`), sign-out button in the rail.
- `getCurrentUser` maps the authed email to a users row (`slack_id = google:<email>`), falling back to the demo user when there's no session/config. Slack OIDC later = swap that key.
- **Demo mode**: when Supabase env vars are absent, the middleware passes everything through and `/login` shows an "Enter demo mode" button — OAuth is impossible without Supabase anyway.
- **Setup**: Supabase Dashboard → Auth → Providers → Google (needs a Google OAuth client), and add `http://localhost:3000/auth/callback` + prod URL to the redirect allowlist.

---

## ✅ What Has Been Built So Far

### Core Scaffolding & Design Spine
- Complete Next.js 16 App Router setup with responsive layout and glassmorphism navigation.
- Full PostgreSQL database migration script (`001_initial_schema.sql`) defining `users`, `events` (scoring ledger), all game tables (`wordle_days`, `bespokle_days`, `trivia_days`, `bereal_days`, etc.), `jobs` queue, and leaderboard views.
- Centralized point calculation library (`src/lib/points.ts`) implementing Section 9 of the design doc.

### Game & Feature Implementations
1. **Bespoke Wordle (`/wordle`, `/api/wordle`)**
   - 6×5 grid with flip/pop tile animations and on-screen + physical keyboard support.
   - **Strict Server-Side Validation**: Answers are never sent to the client; API validates guesses against `wordle-dictionary.ts`.
   - End-of-game reveal with witty AI blurbs, emoji grid generator, and clipboard copying.

2. **Bespokle — Word Ladder (`/bespokle`, `/api/bespokle`)**
   - Daily word ladder puzzle transforming a start word into `POKE` one letter at a time.
   - BFS solver (`ladder-solver.ts`) verifies valid paths and computes par scores.
   - **The Bespoke Reveal (Money Shot)**: When solved, `BES` slides in from the left with spring physics to form `BESPOKE`, triggering glowing letter animations, radial expansion, and 100 falling confetti pieces.

3. **Company Trivia (`/trivia`, `/api/trivia`)**
   - 3 timed multiple-choice questions (20 seconds each) with an animated countdown progress bar.
   - Speed bonus calculation (+3 pts for <5s, +2 pts for <10s, +1 pt for <15s).
   - Source quote reveals from company documentation after each answer, plus a "Dispute question" flag button.

4. **Two Truths & a Lie (`/ttal`)**
   - Voting UI featuring a daily employee card, 3 interactive statement buttons, and live voting percentages.
   - Past reveals archive showing previous lies and percentage of company fooled.

5. **Leaderboard (`/leaderboard`)**
   - Game tab switcher (Global, Wordle, Bespokle, Trivia, BeReal).
   - Dynamic AI Sports Commentary generated by "The Arcade Desk" persona for each tab.
   - Ranked player rows with medal icons (🥇🥈🥉), streak fire badges (🔥), and gradient point values.

6. **User Profile (`/me`)**
   - Avatar ring with glow pulse, stats grid (Total Points, Rank, Events, Longest Streak).
   - Active streak trackers per game and badge collection (earned vs. locked grayscale badges).
   - Player Card preview and animated toggle switches for feature opt-ins (BeReal AI Edition, TTAL, Story Chain).

---

### Phase 3: Share-to-Slack & Supabase Wiring (COMPLETE)
7. **`<ShareToSlack />` (`src/components/ShareToSlack.tsx`)**
   - Reusable opt-in share button used by Wordle, Bespokle, and Trivia result screens (idle → sharing → queued states, design-token styled).
   - `POST /api/share`: scores the result server-side via `points.ts` into the `events` ledger (deduped: once per game per UTC day), records a `shares` row, and enqueues a `share_commentary` job in `jobs` with the player's last-14-day history + current streak for the worker/AI commentator.
8. **Live Supabase integration**
   - `src/lib/supabase.ts`: server-only client (service-role preferred). **Demo mode**: when env vars are missing every API returns `live: false` and pages fall back to mock data — the app always runs.
   - `GET /api/leaderboard?game=` — standings derived 100% from `events` (per-game tabs, streaks) via pure helpers in `src/lib/stats.ts`.
   - `GET/PATCH /api/me` — real stats, rank, per-game streaks, badges; opt-in toggles persist to `users`.
   - Auth placeholder: all sessions map to a seeded demo user (`slack_id: U_DEMO_PLAYER`) until Sign in with Slack (OIDC) lands.
   - `supabase/seed.sql`: demo users/events/badges so a fresh project lights up immediately.

**To go live:** create a Supabase project → run `001_initial_schema.sql` then `seed.sql` in the SQL editor → copy URL + keys into `.env.local` (see `.env.example`). No code changes needed.

### Phase 6: BeReal, Story Chain, Cards, Digest & Worker (COMPLETE)
9. **BeReal, AI Edition (`/bereal`, `/api/bereal`)** — daily prompt card (rotating list until the admin agent feeds it), camera/file upload with client-side canvas resize (≤1280px JPEG), one post per player per day, 30-min on-time window anchored to the day's first visit "ping", feed with placeholder AI captions, `bereal_post` event scoring, and a `bereal_caption` vision job enqueued for the worker. Storage: Supabase Storage bucket `bereal` (create it in the dashboard), with inline-data-URL fallback if the bucket is missing.
10. **Story Chain (`/story`, `/api/story`)** — "previously on" recap box, illustrated scroll of turn cards (SVGs rendered as data-URL images), open-turn write box (one turn per day, `story_turn` event, `story_illustration` + `story_recap` jobs enqueued). Author lottery + DMs deferred to the worker/Slack phase.
11. **Coffee Chat Cards (`/cards`, `/api/cards`)** — collection grid, "X of N colleagues" counter, silhouettes, "I met someone" mint form (`card_minted` event — note: the schema's events CHECK uses `card_minted`, not the writer/subject split from points.ts). Cards stay "pending confirmation" until the Slack confirm DM exists. `card_flavor` job enqueued.
12. **Friday Digest (`/digest`)** — archive page with a rendered sample issue in The Arcade Desk voice; real digests come from the Friday agent run later.
13. **Worker (`worker/index.mjs`, `npm run worker`)** — polls `jobs`, optimistically claims, dispatches handlers for `share_commentary`, `bereal_caption`, `story_illustration`, `story_recap`, `card_flavor`. AI calls shell out to `claude -p` when `USE_CLAUDE_CLI=1`, otherwise every handler has a canned fallback. Reads `.env.local` itself (no dotenv).

### ⚠️ SLACK IS DEFERRED (team decision 2026-07-05)
No Slack app, tokens, or posting yet. `postToSlack()` in `worker/index.mjs` is a logged no-op with a TODO; the share pipeline (button → `/api/share` → `shares` + `jobs`) is fully wired and the worker writes commentary back to the DB, so flipping Slack on later only means implementing that one function + adding the bot token.

---

## 🚀 Pending Tasks & Next Steps for Claude Code

When picking up development, prioritize the following sequential tasks:

1. **Sign in with Slack (OIDC)** — replace the demo-user placeholder in `src/lib/supabase.ts:getCurrentUser` with real Slack auth; restrict to the company workspace. (Blocked on the Slack decision above.)

2. **Game persistence** — write `wordle_attempts` / `bespokle_attempts` / `trivia_answers` rows from the game APIs (today only shares are persisted; attempts are client-state). Also move daily words/puzzles/questions from hardcoded rotation into `wordle_days`/`bespokle_days`/`trivia_days`.

3. **Slack integration** (when un-deferred) — implement `postToSlack()` in the worker, BeReal/skribbl pings, TTAL DM interview flow, card confirm DMs.

4. **Admin agent (`/agent`)** — nightly content generation pipeline per design doc section 5 (content JSON, validators, PR workflow).

5. **TTAL backend** — `/api/ttal` voting + reveal against `ttal_days`/`ttal_profiles` (the UI at `/ttal` is still mock-only).

---

## ✍️ Copy Rules (user decision 2026-07-06 — NON-NEGOTIABLE)

1. **No quotation marks anywhere in user-facing copy.** One-liners, blurbs, flavor text, captions — none of it is dialogue, so nothing gets quoted. No straight quotes, no curly quotes, no `&ldquo;`/`&rdquo;`.
2. **No semicolons in user-facing copy.** Split into two sentences instead. (Code semicolons are fine — these rules apply to what users read.)
2b. **No em dashes in user-facing copy** (added 2026-07-06). Use a period, a comma, or a middle dot (page titles use `X · Bespoke Social`). Empty stat placeholders use `–` (en dash), never `—`.
3. Avoid copy that sounds AI-generated: no profound-sounding non-sequiturs, no jargon labels users will not know (par became "fastest route"), plain verbs, sentence case.
4. The persona voice is **Stitch, the robotic goat Culture Overlord** (`src/components/Mascot.tsx` — name is a working title). All commentary, digests, and reveals are attributed to him. His prompt in `worker/index.mjs` also enforces the two rules above.

## 🎭 Product Renames (2026-07-06)

- The app is **Bespoke Social** (formerly The Bespoke Arcade)
- **BE(spoke)REAL** (formerly BeReal, AI Edition) — no on-time window (same-day posting is enough), users write their own captions, anonymous heart-likes, nightly **Award Ceremony** (never "AI award ceremony"), most-liked photo earns bonus bespoke social points
- **Two Truths, One Lie** (formerly TTAL) — one featured person per day, results hidden after voting (revealed on Slack at EOD), submit-your-own form
- Nav: "Board" → "Leaderboard"
- Points are called **bespoke social points** in copy — earned by being active (all games + posting)

## 👥 Demo Cast (until backend identity)

Exactly three profiles appear everywhere: **Adhvaith** (the signed-in player), **Tarun**, **Shrey** — defined in `src/lib/demo-people.ts`, rendered via `src/components/Avatar.tsx` (photo → gold-initial fallback). Photos go in `public/profiles/{adhvaith,tarun,shrey}.jpg` (see the README there).

## 📄 SLACK-TODO.md

Slack integration is deferred to the end and the project will be handed off before completion. **`SLACK-TODO.md` at the repo root is the living list of every Slack-dependent piece** — keep it updated. The in-app Send on Slack buttons are intentionally non-functional (`src/components/SlackButton.tsx`); the full share pipeline (`ShareToSlack.tsx` + `/api/share` + worker) is built and parked.

## 💡 Key Rules & Conventions for AI Assistants

- **Never expose answers to clients**: Always perform game evaluations (Wordle, Bespokle, Trivia answers) inside Next.js `/api/` routes.
- **Maintain Design Integrity**: Use existing CSS variables and button utility classes (`btn`, `btn-primary`, `btn-secondary`). Ensure responsive layouts on mobile devices.
- **Preserve Comments**: Do not strip out existing documentation or docstrings unless explicitly refactoring that logic.
- **Run Locally**: Use `npm run dev` to test changes on `http://localhost:3000`.
