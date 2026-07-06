# Bespoke Social — app

The Next.js app. For the product overview, feature list, and background, see the [root README](../README.md).

## Development

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000). Without a `.env.local` the app runs in demo mode with seeded data — see [`.env.example`](.env.example) to wire up a real Supabase project instead.

```bash
npm run build   # production build
npm run lint    # eslint
npm run worker  # jobs-queue worker (worker/index.mjs)
```

## Key docs

- [`CLAUDE.md`](CLAUDE.md) — full architecture, data model, and design system reference
- [`SLACK-TODO.md`](SLACK-TODO.md) — what's stubbed pending Slack integration
- [`DEMO-SCRIPT.md`](DEMO-SCRIPT.md) — demo video script
