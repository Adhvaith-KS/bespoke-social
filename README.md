# Bespoke Social

A culture app for Bespoke Labs, built for a company hackathon by three people across three time zones. It runs the team's daily games, photo challenges, trivia, and gossip, all narrated by **Stitch**, a robotic goat Culture Overlord who takes the whole thing far too seriously.

Sign-in is Google, restricted to `@bespokelabs.ai`. Everyone earns bespoke social points by being active: solving puzzles, posting photos, showing up.

## What's in the app

- **Bespoke Wordle** (`/wordle`) — daily 5-letter word from company vocabulary, 6 guesses, server-validated so the answer never reaches the client, AI-written lore blurb on reveal.
- **Bespokle** (`/bespokle`) — a word-ladder puzzle: change one letter at a time until you reach `POKE`, then watch `BES` stamp in front of it for the full `BESPOKE` reveal (confetti included). Puzzles are verified solvable by a BFS solver before they ship.
- **Company Trivia** (`/trivia`) — three timed multiple-choice questions pulled from real company lore, each with a hidden source quote revealed after answering, plus a speed bonus.
- **Two Truths, One Lie** (`/ttal`) — one featured teammate a day, three statements, vote on the lie. Results stay hidden until end of day.
- **BE(spoke)REAL** (`/bereal`) — one photo prompt a day, post any time before midnight, write your own caption, anonymous heart-likes, nightly Award Ceremony.
- **Story Chain** (`/story`) — an illustrated collaborative saga, one person adds a few lines a day.
- **Coffee Chat Cards** (`/cards`) — mint a collectible card about a colleague after meeting them.
- **Leaderboard** (`/leaderboard`) — global and per-game standings with AI race commentary in Stitch's voice.
- **Friday Digest** (`/digest`) — a weekly newsletter recapping the whole week, written by Stitch.
- **Profile** (`/me`) — stats, streaks, badges, player card, feature opt-ins.

Every feature that scores points writes to one shared events ledger, so streaks, badges, and leaderboards are all derived from the same source of truth rather than tracked separately per game.

## Status

Slack integration was deliberately deferred (team decision) so the rest of the app could get fully built first — see [`bespoke-arcade/SLACK-TODO.md`](bespoke-arcade/SLACK-TODO.md) for exactly what's stubbed and why. Everything else above is live and playable. The app also runs in a demo mode with no database configured at all, so it's never blocked on setup.

## Tech stack

- **Next.js** (App Router) + TypeScript
- **Supabase** (Postgres + Auth + Storage) — optional; the app falls back to demo data when it isn't configured
- Plain CSS with a shared design-token system (no Tailwind)
- A small Node worker (`bespoke-arcade/worker/`) that polls a jobs queue and shells out to `claude -p` for AI-generated commentary, captions, and blurbs

## Running it locally

```bash
cd bespoke-arcade
npm install
npm run dev
```

Open `http://localhost:3000`. Without a `.env.local`, the app runs in demo mode with seeded data. To go live against a real database, see `bespoke-arcade/.env.example` and `bespoke-arcade/supabase/migrations/001_initial_schema.sql`.

## Repo layout

```
bespoke-arcade/    the Next.js app, worker, and database migrations
docs/              original pre-build planning document (kept for context)
```

## Background

This started life as a detailed design document written before any code existed, handed to coding agents as a build spec. It's kept at [`docs/original-design-doc.md`](docs/original-design-doc.md) for anyone curious how the project was scoped, alongside the demo video script at [`bespoke-arcade/DEMO-SCRIPT.md`](bespoke-arcade/DEMO-SCRIPT.md).

## Team

Adhvaith, Tarun, and Shrey, spread across the US and India, supervised loosely by a robotic goat.
