# SLACK-TODO — everything deferred until Slack integration

> **Living handoff document.** This project will be transferred before it is
> fully complete. Every Slack-dependent feature is deliberately stubbed —
> this file is the single list of what remains. Keep it updated whenever a
> new Slack touchpoint is added or one is completed.

## Current state (2026-07-06)

- **No Slack app exists yet.** No tokens, no webhooks, no bot.
- The UI ships **non-functional "Send on Slack" buttons** via
  `src/components/SlackButton.tsx` (shows a "lands later" note on click).
- The backend share pipeline **already works end to end minus Slack**:
  share → `/api/share` → `shares` + `jobs` tables → worker writes AI
  commentary back to the DB. Only the actual posting is missing.
- `postToSlack()` in `worker/index.mjs` is a logged no-op with a TODO —
  implementing that one function (chat.postMessage + `SLACK_BOT_TOKEN`)
  turns most of this list on.

## To build, in rough priority order

1. **Slack app + install** — one app, one bot user. Scopes:
   `chat:write, chat:write.public, commands, im:write, im:history, users:read`.
   Channels: `#the-arcade` (pings/ceremonies) and `#arcade-scores` (results).
   Env vars already templated in `.env.example`.

2. **`postToSlack()` in the worker** — chat.postMessage; store returned `ts`
   into `shares.slack_ts`.

3. **Wire the Send on Slack buttons** — replace `SlackButton` usages
   (wordle, bespokle, trivia results) with the existing `ShareToSlack`
   component (`src/components/ShareToSlack.tsx`, kept in the repo, already
   enqueues `share_commentary` jobs). Post format: player name + spoiler-free
   grid + Stitch commentary + streak, into `#arcade-scores`.

4. **Two Truths, One Lie EOD reveal** — voting results are intentionally
   hidden in the app. A scheduled job posts the reveal (person, the lie,
   vote split, one Stitch line) to `#the-arcade` at end of day. Voting
   data needs persisting first (`ttal_days.votes`).

5. **BE(spoke)REAL Award Ceremony** — nightly job posts awards over the
   day's photos; most anonymous likes wins bonus bespoke social points
   (likes need a table — currently client-side only).

6. **Daily pings** — BE(spoke)REAL prompt ping, story-chain your-turn DM,
   skribbl session announcements.

7. **Coffee chat card confirmations** — DM the card subject a confirm
   button (cards show "Pending" in the UI until this exists). Donut-bot
   match verification for the mint rule lives here too.

8. **Sign in with Slack (OIDC)** — replace Google auth or run alongside it.
   Users are keyed `slack_id = google:<email>` today, designed to be
   swapped to real Slack IDs in one migration.

9. **Stitch in Slack** — the Culture Overlord persona posts everything
   above in one voice. Persona prompt lives in `worker/index.mjs`
   (`PERSONA`) and `src/components/Mascot.tsx` (name/title). House style:
   no quotation marks, no semicolons.

## Done so far

- (nothing — Slack work has not started, by design)
