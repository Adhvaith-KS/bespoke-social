# The Bespoke Arcade: Design Document

A self-running culture app for Bespoke Labs, built for the June 12 to 14 hackathon. Frontier models (Claude Fable 5 and GPT-5.5) generate all daily content, judge photos, write commentary, interview employees, and operate the app end to end. The demo's closing line: no human runs this app.

This document is written to be handed to coding agents. It specifies architecture, data model, every feature, every scheduled job, AI call patterns, prompts guidance, guardrails, and a three-day build plan.

---

## 1. Product summary

A web app plus a Slack bot for Bespoke Labs employees, distributed across the US and India. Features:

1. **BeReal, AI edition**: a daily AI-generated photo challenge pinged at a random hour per region, with end-of-day AI superlatives judged by a vision model.
2. **Bespoke Wordle**: a daily themed 5-letter word from company/ML vocabulary, with an AI lore blurb on reveal, and a share-to-Slack flow where the bot posts the result with 1-2 lines of personalized AI commentary informed by the player's history.
3. **Bespokle**: a Poople-style daily word ladder. Players transform a start word into POKE one letter at a time; on solve, the UI stamps BES in front for the BESPOKE reveal. Same share-with-commentary flow.
4. **Skribbl sessions**: 1-2 scheduled 15-minute skribbl.io sessions per day in the US/India overlap window, with AI-generated custom word lists and Slack pings before start.
5. **Two Truths and a Lie**: the bot interviews opted-in employees via Slack DM, drafts three statements, the employee approves, and one person is featured per day on the website. Colleagues vote; results reveal the next morning with the new person.
6. **Company trivia**: three daily questions generated from the company wiki/handbook, each backed by a hidden source quote, with a speed bonus and an individual leaderboard.
7. **Story chain**: one employee per day (lottery among opt-ins, Slack notified) extends an ongoing saga; the model illustrates each addition and maintains a "previously on" recap; weekly illustrated chapter compiled to Slack.
8. **Friday culture digest**: a named AI persona writes a weekly newsletter recapping everything, posted to Slack and archived on the site.
9. **Coffee chat cards**: piggybacks on the existing Slack coffee-chat matchmaker. After meeting someone, both people confirm and the meeting-initiator writes 1-2 lines about them; the model mints a collectible card showing the person's role, flavor quote, and culture badges. No rarity tiers.
10. **Profiles, streaks, badges, leaderboards**: unified points ledger across all games, per-game streaks, culture badges, weekly AI-generated player cards, and leaderboards with AI race commentary in a consistent persona.
11. **The admin agent**: a scheduled headless Claude Code run that generates all of the next day's content, validates it deterministically, reviews yesterday's output for tone, and merges its own PR. The commit history is demo evidence.

Cut from scope (do not build): quests, card rarity tiers, AI skribbl player, US-vs-India team leaderboards, meme tournament.

---

## 2. Constraints and model access

- **No API keys.** Teams use personal plans: Claude Max ($200 tier, includes Claude Code) and ChatGPT (GPT-5.5 access, includes Codex CLI).
- **Consequence:** all AI calls are made by shelling out to CLIs on a worker machine:
  - `claude -p "<prompt>" --output-format json` for Fable 5 (supports image inputs via file paths in the prompt, which is how vision superlatives work).
  - `codex exec "<prompt>"` for GPT-5.5 where a second model is wanted (e.g., trivia question adversarial review, Guess-the-AI style tasks if added later).
- **Worker box:** one always-on machine (a teammate's spare laptop, a home server, or a tiny VM). It runs the job queue worker and all cron entries. The web app never calls models directly; it enqueues jobs.
- **Latency budget:** share commentary and interview replies can take 5-20 seconds. All AI-dependent UX is asynchronous: the user gets an immediate acknowledgment, the result arrives as a Slack message or a page update.
- **Fallbacks:** every AI-generated artifact has a static fallback (a canned prompt, a generic blurb) so a failed model call never blocks the daily cycle.

---

## 3. Architecture

```
┌────────────────────────────────────────────────────────┐
│ Vercel (or similar)                                    │
│  Next.js app: website + API routes + Slack webhooks    │
└───────────────┬────────────────────────────────────────┘
                │ reads/writes
        ┌───────▼────────┐
        │ Postgres        │  (Supabase free tier: DB +
        │ + object storage│   storage for BeReal images
        └───────▲────────┘   and SVG illustrations)
                │ polls jobs table
┌───────────────┴────────────────────────────────────────┐
│ Worker box (always on)                                 │
│  - job queue worker (Node script, polls `jobs` table)  │
│  - cron entries (see section 6)                        │
│  - claude CLI (Max plan auth) + codex CLI              │
│  - admin agent nightly run (Claude Code, PR workflow)  │
└────────────────────────────────────────────────────────┘
```

**Stack recommendation:** Next.js (App Router) + Supabase (Postgres, auth, storage) + Slack Bolt for JS (or plain HTTP endpoints for Slack events) + a plain Node worker script. Boring and fast to build.

**Auth:** Sign in with Slack (OIDC). This gives the site the user's Slack ID for free, which is the primary key tying website activity to bot DMs and pings. Restrict to the company workspace.

**Job queue:** a `jobs` table in Postgres (`id, type, payload jsonb, status, result jsonb, created_at, run_after`). The web app inserts; the worker polls every few seconds, claims a job, shells out to the right CLI, writes the result, and posts to Slack if the job requires it. No Redis, no extra infra.

**Repo layout:**

```
/app            Next.js site
/worker         queue worker + CLI wrappers
/agent          admin agent: prompts, validation scripts, content JSON
/content        committed daily content (see section 5)
/scripts        BFS ladder solver, dictionary checks, seeders
```

---

## 4. Data model

Postgres tables. Names are suggestions; keep them if nothing better comes to mind.

**users**: `id, slack_id, name, avatar_url, role_title, region ('US'|'IN'), timezone, opt_in_bereal, opt_in_ttal, opt_in_story, created_at`

**events** (the spine of the whole app; every feature writes here): `id, user_id, type, points, payload jsonb, created_at`
- Event types: `wordle_solve, wordle_fail, bespokle_solve, bereal_post, bereal_award, trivia_answer, ttal_vote, ttal_fool, story_turn, card_minted, skribbl_join, digest_mention`
- Points are computed at insert time from a single `POINTS` config map. Leaderboards, streaks, and player cards are all derived from this table. Do not store points anywhere else.

**wordle_days**: `date, word, blurb, source_note, share_grid_emoji_key`
**wordle_attempts**: `id, user_id, date, guesses jsonb, solved, num_guesses, duration_s, shared_to_slack`

**bespokle_days**: `date, start_word, par, solution_path jsonb, one_liner`
**bespokle_attempts**: `id, user_id, date, path jsonb, steps, solved, shared_to_slack`

**bereal_days**: `date, prompt_text, ping_time_us, ping_time_in`
**bereal_posts**: `id, user_id, date, image_path, posted_at, on_time bool, ai_caption`
**bereal_awards**: `id, date, post_id, award_title, award_text`

**ttal_profiles**: `user_id, statements jsonb (array of 3), lie_index, status ('interviewing'|'pending_approval'|'approved'|'featured'|'done')`
**ttal_days**: `date, user_id, votes jsonb (voter_id -> guessed_index), revealed bool`

**trivia_days**: `date, questions jsonb (array of {q, options[4], answer_index, source_quote, retired bool})`
**trivia_answers**: `id, user_id, date, q_index, answer_index, correct, answered_in_s`

**story_turns**: `id, date, user_id, text, illustration_svg, recap_after`
**story_lottery**: `date, user_id, notified_at, status ('pending'|'written'|'passed')`

**cards**: `id, owner_id, subject_id, flavor_text, subject_role, badges_snapshot jsonb, confirmed_by_subject bool, met_on date`

**badges**: `id, user_id, badge_key, label, awarded_at` (awarded by the weekly agent run: e.g., `wordle_wizard` for best weekly average, `ladder_legend`, `most_on_time_bereal`, `plot_twister`, `trivia_titan`, `social_butterfly` for most cards)

**shares**: `id, user_id, game, date, result_summary jsonb, commentary_text, slack_ts`

**config**: `key, value jsonb` (kill switches: `feature.wordle.enabled`, `feature.bereal.enabled`, etc.; the worker and site check these before acting)

**jobs**: as described in section 3.

---

## 5. The admin agent (build this first, it feeds everything)

A nightly headless Claude Code run on the worker box. It is a real agent with file access to the repo, not a single prompt.

**Nightly run, 07:00 UTC (midnight PT / 12:30 PM IST), produces `/content/YYYY-MM-DD.json`:**

1. **Wordle word:** pick a 5-letter word from the themed vocabulary file (`/agent/vocab.md`, seeded by hand Friday with ML jargon, product names, inside jokes; agent may propose additions in the PR description). Constraints: must pass dictionary check, must not appear in the used-words ledger. Write the reveal blurb (2-3 sentences, witty, cite where the term shows up in company life if it can).
2. **Bespokle puzzle:** pick a 4-letter start word, run `/scripts/ladder-solve.js` (BFS over an embedded 4-letter dictionary) to verify a path to POKE exists, record par and one shortest path, write a one-liner teaser about the route. Never emit a start word the solver has not verified.
3. **BeReal prompt:** one creative photo challenge, doable at a desk, culturally neutral across US and India, no faces required. Also pick the two random ping times (inside 10:00-17:00 local for each region).
4. **Trivia questions:** three questions from `/agent/wiki-snapshot/` (a folder of exported public wiki/handbook pages, refreshed manually or by the agent). Each question must include a verbatim `source_quote` copied from the snapshot. A validation script rejects any question whose source_quote is not a substring of a snapshot file. This is the anti-hallucination gate.
5. **Skribbl word pack:** 40 words mixing company jargon, this week's app memes, and drawable everyday words. Written to the content file; the session job pastes them into the skribbl.io custom words box (or includes them in the announcement for the host to paste, see 7.4).
6. **Tone review:** read yesterday's generated awards, commentary, and blurbs from the database (exported to `/agent/yesterday.json` by a pre-step). Flag anything mean-spirited, targeting, or repetitive into the PR description. If something crossed a line, add the pattern to `/agent/tone-guide.md`.
7. **Open a PR.** CI runs the validators (dictionary, ladder solver, source-quote substring check, JSON schema). On green, the agent merges its own PR. A deploy hook (or the worker polling the repo) loads the new content file into the database.

**Friday extended run** additionally produces the digest (section 7.8), weekly badges, and player cards (section 7.10).

**Guardrails baked into the agent's system prompt:**
- Tone: playful roast, never punching down; never comment on appearance, home circumstances, religion, or anything visible in a photo that the person did not clearly intend to show.
- Never invent facts about a named employee. Statements about people come only from data they submitted.
- Respect kill switches: if a feature is disabled in config, skip its content.
- All output is JSON matching `/agent/schema.json`; prose lives inside fields.

---

## 6. Scheduled jobs (worker cron)

All times below; day boundary for puzzles is 00:00 UTC.

| Time | Job |
|---|---|
| 07:00 UTC daily | Admin agent nightly run (PR pipeline) |
| 00:00 UTC daily | Activate new Wordle, Bespokle, trivia; feature next TTAL person; run story lottery |
| Random, per region (from content file) | BeReal ping to #the-arcade with the day's prompt, region-targeted |
| 03:30 UTC daily (9 AM IST / 8:30 PM PT) | BeReal awards ceremony: enqueue vision job over the day's posts, post awards thread |
| 03:30 UTC daily | TTAL reveal for yesterday's person + announce today's featured person |
| 15:30 UTC and 17:30 UTC (9 PM / 11 PM IST = 8:30 / 10:30 AM PT) | Skribbl session: post link + word pack + who's-in tally; 10-minute warning ping |
| 09:00 UTC daily | Story chain: check 24h window; if the day's author passed, run pass logic and pick tomorrow's author early |
| Friday 10:00 UTC | Digest, badges, player cards (agent extended run), post digest to Slack |
| Hourly | Leaderboard commentary refresh if standings changed materially (delta threshold, e.g., any top-5 change) |

The 03:30 UTC ceremony slot is deliberate: India sees awards and reveals at breakfast, the US sees them before end of evening, and nothing important happens while both regions sleep.

---

## 7. Feature specs

### 7.1 Slack integration (one app)

One Slack app, one bot user, installed once by a workspace admin. Everything below runs through it.

- **Scopes:** `chat:write, chat:write.public, commands, im:write, im:history, users:read, files:read` (files:read only if BeReal upload-via-Slack is built, see 7.3).
- **Channels:** create `#the-arcade` (daily pings, ceremonies, skribbl calls, digest) and `#arcade-scores` (the share-with-commentary channel; every shared Wordle/Bespokle/trivia result lands here so it stays high-signal and people can mute the main channel without losing scores).
- **Slash commands:** `/arcade` (links + today's status), `/wordle` (opens the site to today's puzzle; optionally accept guesses as text for the truly keyboard-bound, stretch goal), `/mycard` (DMs your current player card).
- **Interactivity:** buttons on DMs (approve/edit TTAL statements, confirm card meetings, "pass my story turn").
- **Event handling:** DMs to the bot during a TTAL interview are routed to the interview job (section 7.6).

### 7.2 Share-to-Slack with AI commentary (shared component, build once)

Used by Wordle, Bespokle, and trivia.

Flow: player finishes a game on the site, sees their result plus a "Share to Slack" button. Click enqueues a `share_commentary` job with: game, result summary (guess count / steps vs par / trivia score and time), and the player's last 14 days of results for that game plus current streak. Worker calls Fable 5: "You are the Arcade commentator (persona card attached). Write 1-2 lines about this result in context of this player's recent history. Playful, specific, never cruel." Bot posts to #arcade-scores: the emoji grid (spoiler-free), the commentary, and the player's streak. `shares` row records it.

Rules: sharing is always opt-in per attempt; never auto-post results. The commentary prompt receives history for context but is instructed never to reveal today's word or path. Include 2-3 few-shot examples in the prompt to lock tone.

Example target output: "Priya's third straight sub-par ladder. The word POKE has started flinching when she logs on."

### 7.3 BeReal, AI edition

- **Ping:** at the region's random time, the bot posts the day's prompt in #the-arcade with a link to the upload page. The window for "on time" is 30 minutes; late posts are accepted all day and flagged `on_time = false`.
- **Upload page:** camera capture or file upload, stored in Supabase storage, private bucket, served via signed URLs to logged-in employees only.
- **AI caption:** on upload, enqueue a vision job; Fable 5 sees the image and writes a one-line caption. For late posts, the caption gently acknowledges tardiness ("posted 4 hours late, but the plant looks like it waited patiently").
- **Awards ceremony (03:30 UTC):** a single vision job receives all of the day's images (as file paths in the claude CLI prompt) plus the prompt text, and returns one superlative per post, JSON, unique titles. Everyone who posted gets an award; nobody is ranked. Bot posts the ceremony as a threaded reply under the original prompt message, one award per reply, images referenced by poster name.
- **Points:** posting earns points; on-time earns a bonus; awards earn a small flat bonus (identical for all, awards are flavor, not competition).
- **Privacy guardrails in the vision prompt:** comment only on what the challenge invited; never on faces, bodies, mess that looks unintentional, or anything identifying about someone's home. Opt-in feature (`opt_in_bereal`).

### 7.4 Skribbl sessions

- Two daily slots in the overlap window (see cron table). At T-10 minutes the bot pings #the-arcade: "Skribbl at 9 PM IST / 8:30 AM PT. React with a raised hand to show you're in." At T-0 it posts the room link.
- Room creation: skribbl.io private rooms are created by a human host in-browser (no public API), so the announcement includes the day's AI word pack in a copy-paste code block and designates a host (rotate among reactors; first raised-hand reaction is host). The host pastes the custom words, sets rounds to fit 15 minutes, and drops the link in the thread. Automating this with a headless browser is a stretch goal, not a launch requirement.
- Joining (raised-hand react) logs a `skribbl_join` event for small points.

### 7.5 Bespoke Wordle

- Standard Wordle rules, 6 guesses, 5-letter themed word from the content file. Guesses validated against a standard dictionary plus the company vocab list.
- On solve or fail: reveal the blurb (with its source note), show the emoji grid, streak, and the Share to Slack button (7.2).
- Anti-cheat is not worth real effort; one honest measure: the answer never appears in client code, guesses are checked server-side.

### 7.6 Bespokle (word ladder to BESPOKE)

- Daily start word from the content file, target POKE, change exactly one letter per step, every step must be a real 4-letter word (same dictionary as the solver, so par is always achievable).
- UI: ladder of rows; typing a valid next word appends it; invalid words shake. On reaching POKE, an animation slides BES in front of it, the full word BESPOKE glows, confetti, done. This reveal is a demo money shot; spend 30 minutes making it feel good.
- Show par after solving, plus steps-over-par as the score. Share button (7.2) posts a spoiler-free grid (one row per step, letters hidden, changed-letter position highlighted).
- The day's one-liner from the agent shows on the puzzle page as a teaser.

### 7.7 Two Truths and a Lie

- **Interview:** when a user opts in (site toggle or DM the bot "interview me"), enqueue an interview session. The bot DMs 4-6 questions one at a time (background, hobbies, surprising facts, near-misses). Answers are stored raw. The model then drafts three statements (two true from the answers, one plausible lie it invents in the same register) and DMs them with Approve / Edit / Regenerate lie buttons. Nothing is public before explicit approval. Hard rule in the prompt: true statements must be traceable to the person's own answers verbatim or lightly paraphrased; the lie must be clearly fictional, never plausible-and-damaging (no lies about performance, relationships, health, or beliefs).
- **Daily feature:** at 00:00 UTC, the next approved profile is featured on the site (queue order: approval time). Voting is open to everyone else for ~27 hours; one vote per person; votes hidden until reveal.
- **Reveal (03:30 UTC next day):** bot posts to #the-arcade: the person, the lie, the vote split, and one line of AI commentary ("62% of the company believed Arjun once wrestled a goat. The goat remains unconfirmed."). Points: correct guessers score; the featured person scores per fooled voter.

### 7.8 Company trivia

- Three questions per day, multiple choice, 4 options, from the content file. Timer per question (20 seconds) for the speed bonus; score = correctness + speed bonus.
- After answering, the reveal shows the source quote and a "dispute" button. A dispute marks the question for the agent's next tone/quality review; the agent retires bad questions and notes the pattern.
- Individual leaderboard only. No team pools.

### 7.9 Story chain

- Opt-in pool. Daily lottery picks one author (no repeats until everyone has gone); bot DMs them: the current recap, the last two turns verbatim, three optional twist seeds, and a 24-hour deadline with a Pass button.
- The author submits 1-3 sentences on the site or by replying to the DM. On submission: enqueue illustration job (Fable 5 generates a flat-style SVG illustration of the day's addition; SVG keeps art style consistent and needs no image-gen access) and a recap update job (rolling "previously on," max 120 words, rewritten daily).
- If the window lapses: mark passed, the bot posts one gentle line in #the-arcade ("Day 3: our hero remains frozen mid-leap, as today's author was in meetings"), and the lottery picks the next person immediately.
- The story page shows the full illustrated scroll; each day's turn is a card with text, author, and illustration.
- **Friday:** the agent compiles the week's turns into a single illustrated chapter (one HTML page or PDF) and posts it to #the-arcade.

### 7.10 Friday digest, badges, player cards

- **Persona:** one named narrator used for the digest, leaderboard commentary, share commentary, and reveals. Define them in `/agent/persona.md` (name, voice rules, 5 example lines) so every prompt imports the same card. Suggested vibe: a sports-desk anchor who takes the Arcade far too seriously. Let the team pick the name Friday morning; it matters for the demo.
- **Digest contents:** best BeReals of the week (embedded images), Wordle and Bespokle stats and streak drama, TTAL highlights, story chapter link, trivia standings, cards minted this week, next week teaser. Posted to #the-arcade and archived at `/digest/YYYY-WW`.
- **Badges:** awarded by the Friday run from the events table (see badges table for the starter set). Badges appear on profiles and on coffee-chat cards.
- **Player cards:** one per active user: avatar, role, top stats, badges, and 2-3 lines of flavor text from the persona. Rendered as a nice HTML card component; `/mycard` DMs a screenshot or link.

### 7.11 Coffee chat cards

- Relies on the existing matchmaker bot for pairing; this app only handles what happens after a meeting.
- Flow: either person opens the site's "I met someone" form (or DMs the bot), selects the colleague, and writes 1-2 lines about them. The bot DMs the other person a confirm button. On confirmation, the model turns the lines plus the subject's profile (role, badges) into card flavor text, and a card is minted into the writer's collection. Encourage both directions (each writes about the other) but do not require it.
- Card design: portrait layout, avatar, name, role title, flavor quote, badge icons, mint date. All cards equal; no rarity.
- Collection page: grid of collected cards, a counter ("14 of 63 colleagues"), and an uncollected silhouette grid for the completionist itch.
- Guardrail: flavor text generation must stay within what the writer submitted plus public profile fields; the subject's confirm step doubles as consent for the card's contents (show them the final card in the confirm DM).

### 7.12 Leaderboards

- Global points leaderboard plus per-game boards, all derived from `events`.
- Commentary: on material standings changes, a job generates 1-2 lines in the persona voice, shown on the leaderboard page and included in the digest. Keep a small history so narratives have continuity ("Mahesh has now been overtaken three times this week, each time while asleep").

---

## 8. Website map

- `/` Today: today's BeReal prompt and feed, links to today's Wordle, Bespokle, trivia, featured TTAL person, story's latest turn, next skribbl time.
- `/wordle`, `/bespokle`, `/trivia` game pages.
- `/ttal` today's featured person + voting; archive of past reveals.
- `/story` the illustrated scroll.
- `/cards` your collection + silhouettes; `/cards/[user]` public collections.
- `/leaderboard` global + per game + commentary.
- `/digest/[week]` archive.
- `/me` profile: streaks, badges, player card, opt-in toggles.
- `/bereal` feed for the day + upload; past days archive.

Design note: one strong visual identity beats eleven okay ones. Pick a palette and a display font Friday and reuse everywhere; the player cards and Bespokle reveal are where visual effort pays off most.

---

## 9. Points (single source of truth, tune later)

| Event | Points |
|---|---|
| Wordle solve | 10 + (6 - guesses) |
| Bespokle solve | 10 + max(0, 5 - steps_over_par) * 2 |
| Trivia correct | 5 + speed bonus 0-3 |
| BeReal post | 8 (+4 on time) |
| BeReal award | +3 flat |
| TTAL correct vote | 5 |
| TTAL fooling a voter | 2 per voter |
| Story turn | 10 |
| Skribbl join | 3 |
| Card minted (writer) | 4; (subject) 2 |

Streak multiplier: 7-day any-game streak gives +10% points that week. Keep it simple.

---

## 10. Build plan

**Team assumption:** 2-4 people. Adjust parallelism accordingly. Tiers from earlier stand: a demo where the spine works beautifully beats eleven half-features.

**Friday**
- Morning: repo, Next.js + Supabase, Slack app created and installed, Sign in with Slack, users table syncing from workspace.
- Midday: events table + points map + jobs table + worker skeleton with `claude -p` and `codex exec` wrappers proven end to end (one hello-world job that posts to Slack).
- Afternoon: admin agent v1: content JSON schema, vocab file, ladder solver script, dictionary check, first manual run producing Saturday's content. PR pipeline can be manual-merge today, automated Saturday.
- Evening: Wordle playable end to end with the generated word. Share-with-commentary component working (this de-risks the hardest cross-cutting piece early).

**Saturday**
- Bespokle game + reveal animation. BeReal upload + ping + captions; awards job written and tested on seed photos. Trivia. Leaderboards + streaks. Admin agent PR automation + validators in CI. Skribbl announcement job. Cron entries live so Sunday's content generates itself overnight (this matters: the demo can then truthfully show an unattended run).
- Evening: TTAL interview flow (DM loop is the fiddliest Slack piece; timebox it, and if it fights you, fall back to a web form interview with the model generating questions dynamically).

**Sunday**
- Morning: story chain, coffee-chat cards, player cards, digest generation (run it on the weekend's real data, which by now exists because the team has been dogfooding since Friday night).
- Midday: polish pass: Bespokle reveal animation, card design, empty states, kill switches verified.
- Afternoon: record the demo. Buffer everything else.

**Dogfood from Friday night.** The team playing its own games for two days produces real streaks, real commentary history, and real digest content, which is what makes the demo feel alive instead of seeded.

---

## 11. Demo script (3 minutes)

1. (0:00) Cold open: Slack notification sound. The BeReal prompt lands in #the-arcade. Someone posts a photo; the AI caption appears.
2. (0:25) Wordle solve on screen, hit Share, cut to #arcade-scores where the commentary line lands, referencing the player's streak.
3. (0:50) Bespokle: solve the ladder, the BES stamp animation, confetti. One sentence on the machine-verified puzzles.
4. (1:10) Awards ceremony thread: the vision model's superlatives over real photos from the weekend.
5. (1:30) Rapid montage: TTAL reveal, trivia with its source quote, a story turn with its SVG illustration, a coffee-chat card minting.
6. (2:10) The Friday digest scrolls, narrated by the persona.
7. (2:30) The kicker: the admin agent's GitHub PR history, green checks, self-merged commits, cron log. "Since Friday night, no human has written a word of this app's content. It runs itself."
8. (2:50) Logo, team names.

## 12. Risks and mitigations

- **Slack app approval delay:** request installation Friday at 9:01 AM. If blocked, everything falls back to a single incoming webhook (post-only) and web forms replace DMs; the app survives.
- **CLI rate limits (Max plan 5-hour windows):** the worker retries with backoff and honors `run_after`; nightly generation happens in one batch to spend budget efficiently; fallback content ships in the repo.
- **skribbl.io flow feels manual:** it is, by design; the host-rotation ritual is arguably more social anyway. Say so in the demo if asked.
- **Vision awards misfire on a photo:** tone guardrails in the prompt, plus every award passes through the agent's next-day tone review, plus the kill switch. Also: awards praise, never rank.
- **TTAL discomfort:** approval gate before anything is public; the featured person can withdraw any time before their day.
- **Scope death:** the tier order in section 10 is the law. When behind, cut from the bottom.
