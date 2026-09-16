# RentRadar

Find the cheapest legitimate rental within a chosen radius. RentRadar
aggregates rentals from legally accessible sources, ranks them by **total
move-in cost**, screens for scams, and includes a dedicated affordable
housing search and an income-based affordability calculator.

Full docs live in [`docs/`](./docs):

- [`TECHNICAL_SPEC.md`](./docs/TECHNICAL_SPEC.md) -- the complete spec, folder structure, and task breakdown
- [`ARCHITECTURE.md`](./docs/ARCHITECTURE.md) -- system design and data flow
- [`API.md`](./docs/API.md) -- endpoint reference
- [`DEPLOYMENT.md`](./docs/DEPLOYMENT.md) -- deploy steps, cron setup, cost estimate
- [`ROADMAP.md`](./docs/ROADMAP.md) -- MVP status and what's next
- [`REVENUE_MODEL.md`](./docs/REVENUE_MODEL.md)
- [`LEGAL_AND_DATA_SOURCES.md`](./docs/LEGAL_AND_DATA_SOURCES.md) -- **read this first** if you're wiring up a new source; it's the ToS/licensing status of every marketplace named in the product brief

## Quickstart

```bash
cd rentradar
cp .env.example .env        # fill in DATABASE_URL at minimum
npm install
npm run db:generate
npx prisma migrate dev --name init
npm run db:seed             # loads mock listings so the dashboard isn't empty
npm run dev
```

Visit `http://localhost:3000`. Everything works with zero external API keys:
mock listings populate the dashboard, notifications/AI calls no-op and log
instead of failing, and the map falls back to a text placeholder without a
Mapbox token.

## Scripts

| Command | Purpose |
|---|---|
| `npm run dev` | Start the Next.js dev server |
| `npm run build` / `npm start` | Production build/serve |
| `npm run typecheck` | `tsc --noEmit` |
| `npm test` | Run the vitest unit tests (dedupe, ranking, affordability) |
| `npm run db:migrate` | Apply Prisma migrations |
| `npm run db:seed` | Load mock listings |
| `npm run hunter:run` | Run the AI Rent Hunter ingestion worker once |

## Tech stack

Next.js (App Router) + React + TypeScript + Tailwind on the frontend;
Node.js + PostgreSQL + Prisma on the backend; Mapbox for maps; Twilio +
SendGrid for SMS/email alerts; Clerk for auth; the Claude API for a
second-opinion scam review in the ingestion worker; Elasticsearch is the
documented scaling path once Postgres-backed search outgrows a single
metro (see `docs/ARCHITECTURE.md`).
