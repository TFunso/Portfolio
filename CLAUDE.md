# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Repository shape

This is Tolulope Funso's personal portfolio repo. The root is a GitHub
Pages site (Jekyll `minimal` theme, configured in `_config.yml`) that
renders `README.md` as the resume page — there is no root-level build.
Everything else lives in independent, self-contained project
subdirectories, each with its own `package.json`, Prisma schema, and
Next.js app:

- **`rentradar/`** — a rental search platform (full docs in `rentradar/docs/`)
- **`qcos/`** — a career-evidence tracking app for a Quality Technician (full docs in `qcos/README.md`)

**Always `cd` into the relevant project directory before running any
command** — there are no root-level scripts, and the two apps have
independent dependencies, databases, and deploy targets. Treat each as its
own codebase; nothing is shared or imported across them.

New projects follow the same pattern: an independent directory, its own
README documenting quickstart/architecture/scripts, and a link added from
the root `README.md`'s Projects section.

## Common commands

Both apps share the same script names (Next.js + TypeScript + Prisma), run
from inside the project directory:

```bash
npm install                      # also runs `prisma generate` via postinstall
npm run dev                      # dev server
npm run typecheck                # tsc --noEmit
npm run build                    # production build
npm test                         # vitest run
npm run db:migrate               # prisma migrate dev
npm run db:seed                  # tsx prisma/seed.ts
```

- `rentradar` has real unit tests under `tests/` (`dedupe`, `rank`,
  `affordability`, `geo`) — run a single one with
  `npx vitest run tests/rank.test.ts`. It also has
  `npm run hunter:run` (runs the ingestion worker once, `tsx src/workers/rentHunter.ts`).
- `qcos` has `vitest` wired up but no test files yet. It also has
  `npm run db:push` (`prisma db push`, schema sync without a migration).
- `qcos`'s `build` script runs `prisma migrate deploy && next build` —
  migrations apply as part of every build (including on Vercel, where the
  DB env vars are only available at build/runtime, not to this sandbox).
- Both apps work with zero external API keys configured — see
  "Optional-integration pattern" below.

### CI

Only `rentradar` has GitHub Actions (`.github/workflows/`):
`rentradar-ci.yml` (typecheck + test + build, triggered on changes under
`rentradar/**`) and `rent-hunter-cron.yml` (runs the ingestion worker every
30 minutes). `qcos` has no CI configured — verify manually with
`npm run typecheck && npm run build` before pushing.

## Optional-integration pattern (applies to both apps)

Every external integration in both codebases is written to **no-op or
fall back gracefully when its env var isn't set**, rather than throwing —
this is a deliberate, repeated convention, not an oversight. Examples:
RentRadar's notification senders (Twilio/SendGrid), its Claude
second-opinion scam check, and Clerk auth seam (`src/lib/auth.ts`); QCOS's
`ANTHROPIC_API_KEY`-gated AI polish pass, `RESEND_API_KEY`/`NOTIFY_EMAIL`-gated
weekly email. When adding a new integration to either app, follow this
pattern: check for the credential, skip/log instead of throwing if it's
missing, and keep the feature's core logic (ranking, classification,
scoring) deterministic and independent of whether the integration ran.

## rentradar architecture

Pluggable source-adapter pipeline feeding a single ingestion worker that is
the *only* writer to Postgres; API routes and pages only read.

- **Adapters** (`src/lib/sources/adapters/`: `mockAdapter`,
  `hudAffordableHousingAdapter`, `craigslistRssAdapter`, `jsonLdSiteAdapter`)
  each produce a common `NormalizedListing` (`src/types/listing.ts`), so
  aggregation/dedupe/scoring never know which site a listing came from.
- **`src/workers/rentHunter.ts`** (the "AI Rent Hunter"), run on a schedule:
  fetch all adapters in parallel → `dedupeListings()` → score
  (`scoreScamRisk`/`scoreQuality`, deterministic TypeScript, not a model
  call) → upsert into `Listing` (+ append `PriceHistory` on change) →
  borderline scam scores (50-79) get a second opinion from Claude
  (`assessWithClaude`, logged for human review, never auto-actioned) →
  matching `Alert`s fire notifications.
- **`src/lib/search.ts`** (`runSearch()`) is the single seam both
  `app/dashboard/page.tsx` (server component, no client fetch on initial
  render) and `GET /api/search` call through — and the one place that
  would change if Postgres-backed search is swapped for Elasticsearch at
  scale (documented, not yet implemented).
- Money fields on `Listing` are integer cents. `totalMoveInCost` is
  precomputed at ingestion so ranking is a single `ORDER BY`, not computed
  per-request.
- `SavedSearch` + `Alert` + `AlertMatch` model "notify me when X" as data:
  a saved search is the match criteria, an alert is the channel/trigger, a
  match is the audit trail of what fired.
- Auth: Clerk, routed through `src/lib/auth.ts`'s `requireUserId()` seam
  so route handlers never import Clerk directly; `User.clerkId` joins
  Clerk's identity to RentRadar's domain data.
- Before touching a new listing source, read
  `rentradar/docs/LEGAL_AND_DATA_SOURCES.md` first — it's the ToS/licensing
  status of every marketplace named in the product brief, and several
  sources (Apartments.com, Zillow Bridge, RentCast) require paid/licensed
  access and are gated behind env vars left unset in the OSS/MVP build.
- Full design detail: `rentradar/docs/ARCHITECTURE.md`; endpoint reference:
  `rentradar/docs/API.md`.

## qcos architecture

A verdict/prose split is the core design decision, driven by a hard
constraint: daily capture must take under 30 seconds and never block on
anything external.

- **`src/lib/classifier.ts`** (`classifyEntry()`) is a deterministic
  keyword/rule engine — instant, offline, explainable — that decides
  *counts Y/N, category, impact level, and goal alignment* for a daily
  entry. This verdict is the source of truth and is never overridden by AI.
- **`src/lib/ai.ts`** (`polishProfessionalSummary()`) optionally upgrades
  only the *prose* — the "Professional Summary" sentence — for entries
  that already cleared the evidence bar (`shouldAutoFile()` in
  `src/lib/evidence.ts`), via one Claude call grounded in the facts the
  classifier already extracted. Gated on `ANTHROPIC_API_KEY`; template
  sentence otherwise.
- **`src/lib/weeklyDigest.ts`** is a second, separate AI pass that looks
  *across* a week of entries (not one at a time) for cross-entry patterns
  a per-entry classifier can't see, surfaced on the homepage as
  user-accepted suggestions (never auto-applied to `EvidenceRecord`/`GoalMetricEvent`).
  Triggered by Vercel Cron (`vercel.json` → `/api/cron/weekly-digest`,
  Monday mornings, protected by `CRON_SECRET`) and on-demand by
  `GET /api/weekly-digest`.
- API routes under `src/app/api/` are thin: parse+validate with `zod`,
  call the relevant `src/lib/*` function, read/write via the shared
  `prisma` client (`src/lib/prisma.ts`). All routes export
  `export const dynamic = "force-dynamic"` so Next doesn't try to
  statically prerender them against a database at build time.
- **Prisma + Postgres (Neon via Vercel Postgres) in production**, not
  SQLite — deliberately deviates from the original spec because Vercel's
  serverless functions have an ephemeral, per-invocation filesystem a
  SQLite file can't survive. `directUrl` in `prisma/schema.prisma` points
  at a non-pooled connection (`DATABASE_URL_UNPOOLED`) because Neon's
  pooled connection doesn't support the session locking
  `prisma migrate deploy` relies on. Local dev can point `DATABASE_URL` at
  any Postgres instance, pooled or not.
- JSON-shaped fields (`categories`, `departments`, `goalKeys`,
  `suggestions`, `answers`) are stored as `String` columns and
  (de)serialized through `src/lib/json.ts`'s `toJson`/`fromJson` — not
  Postgres native JSON columns.
- PWA: `@ducanh2912/next-pwa` wraps `next.config.js`; the generated
  `public/sw.js`/`workbox-*.js` are build output and gitignored, not
  checked in. Offline capture (`src/lib/offlineQueue.ts` +
  `src/components/OfflineSync.tsx`) queues brain-dump entries in
  `localStorage` when a POST fails offline and replays them on the
  browser's `online` event — it is not the service worker's job.
- Full feature map (which spec feature lives where) and the four
  beyond-spec additions (weekly digest, email nudge, PWA/offline, Word
  export): `qcos/README.md`.
