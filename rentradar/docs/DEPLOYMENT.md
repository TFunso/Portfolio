# Deployment

## Recommended production topology

| Component | Service | Why |
|---|---|---|
| Next.js app | Vercel (or any Node host) | Zero-config for App Router + Route Handlers; edge caching for static pages |
| PostgreSQL | Neon / RDS / Supabase | Managed Postgres with connection pooling (PgBouncer) for serverless functions |
| Elasticsearch | Elastic Cloud | Managed cluster once search volume outgrows Postgres (see `docs/ARCHITECTURE.md`) |
| AI Rent Hunter worker | Scheduled job: Vercel Cron, GitHub Actions schedule, or a small always-on worker (Fly.io/Render) | Needs to run `npm run hunter:run` on a fixed cadence (e.g. every 30-60 min) |
| Notifications | Twilio (SMS), SendGrid (email), Web Push / FCM (push) | Matches the tech stack requirement |
| Auth | Clerk | Hosted auth, drop-in Next.js middleware |
| Maps | Mapbox | `NEXT_PUBLIC_MAPBOX_TOKEN` |
| AI | Anthropic (Claude API) | Second-opinion scam review in the ingestion worker |

## Environment variables

Copy `.env.example` to `.env` and fill in what you have. The app degrades
gracefully with everything unset: mock data serves the dashboard, and
notification/AI calls no-op and log instead of failing.

## First deploy checklist

1. Provision Postgres, set `DATABASE_URL`.
2. `npm install`
3. `npm run db:generate && npx prisma migrate deploy`
4. `npm run db:seed` (optional -- loads the mock dataset so the dashboard
   isn't empty before real ingestion runs)
5. `npm run build && npm start` (or deploy to Vercel)
6. Schedule `npm run hunter:run` (Vercel Cron / GitHub Actions `schedule:` /
   a small cron container) once at least one real adapter is
   `legallyIntegrated: true` (see `docs/LEGAL_AND_DATA_SOURCES.md`).

## GitHub Actions cron example

```yaml
# .github/workflows/rent-hunter.yml
name: rent-hunter
on:
  schedule:
    - cron: "*/30 * * * *"
jobs:
  ingest:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version: 20 }
      - run: npm ci
        working-directory: rentradar
      - run: npm run hunter:run
        working-directory: rentradar
        env:
          DATABASE_URL: ${{ secrets.DATABASE_URL }}
          ANTHROPIC_API_KEY: ${{ secrets.ANTHROPIC_API_KEY }}
          SENDGRID_API_KEY: ${{ secrets.SENDGRID_API_KEY }}
          TWILIO_ACCOUNT_SID: ${{ secrets.TWILIO_ACCOUNT_SID }}
          TWILIO_AUTH_TOKEN: ${{ secrets.TWILIO_AUTH_TOKEN }}
          TWILIO_FROM_NUMBER: ${{ secrets.TWILIO_FROM_NUMBER }}
```

## Cost estimate (single-metro MVP, monthly)

| Item | Estimate |
|---|---|
| Vercel Pro (or equivalent Node hosting) | $20-100 |
| Managed Postgres (small instance) | $20-50 |
| Elasticsearch (only once introduced) | $95+ (smallest Elastic Cloud tier) |
| Mapbox | Free tier covers <50k map loads/mo |
| Twilio SMS | ~$0.0079/message |
| SendGrid | Free tier: 100 emails/day; paid tiers from $20/mo |
| Clerk | Free tier: 10k MAU; paid from $25/mo |
| Anthropic API (Claude) | Usage-based; borderline-only calls keep volume low (~$5-30/mo at MVP scale) |
| **Total (MVP, one metro)** | **~$150-300/mo** before paid data licenses |

Paid data licenses (Apartments.com/CoStar, Zillow Bridge, Realtor.com/Move,
Zumper partner feeds) are commercial negotiations, not fixed line items --
budget these separately once a partnership is in scope (see
`docs/LEGAL_AND_DATA_SOURCES.md`).

## Scaling strategy

1. **Single metro MVP**: Postgres-only search, mock + HUD + JSON-LD
   adapters, hourly ingestion.
2. **Multi-metro**: add cities to `SEARCH_GRID` in `rentHunter.ts` (or drive
   the grid from distinct `SavedSearch.location` values instead of a
   hardcoded list); introduce Elasticsearch once query volume or geo-radius
   queries need it.
3. **National**: negotiate the commercial data licenses in
   `LEGAL_AND_DATA_SOURCES.md`; move ingestion to a queue-based worker fleet
   (e.g. one SQS/BullMQ job per source-per-metro) instead of one sequential
   script; add read replicas for Postgres.
4. **Mobile**: the API routes are already the contract a React Native /
   Expo client would consume -- no backend changes needed to ship a mobile
   app against the same `/api/*` surface.
