# RentRadar Architecture

## System overview

```
                     ┌─────────────────────────┐
                     │   Source Adapters        │
                     │  (mock, HUD, Craigslist  │
                     │   RSS, JSON-LD sites,     │
                     │   + future partner APIs) │
                     └───────────┬──────────────┘
                                 │ NormalizedListing[]
                                 ▼
                     ┌─────────────────────────┐
                     │  AI Rent Hunter worker   │
                     │  (src/workers/rentHunter)│
                     │  dedupe → score → upsert │
                     │  → detect drops/new →    │
                     │  → notify                │
                     └───────────┬──────────────┘
                                 │
                 ┌───────────────┴────────────────┐
                 ▼                                 ▼
        ┌─────────────────┐              ┌──────────────────┐
        │   PostgreSQL     │◄────────────►│   Elasticsearch    │
        │  (Prisma schema, │   sync job    │  (search index,    │
        │   system of      │              │   geo + full text)  │
        │   record)        │              └──────────────────┘
        └────────┬─────────┘
                 │
                 ▼
        ┌─────────────────┐        ┌───────────────────┐
        │  Next.js API     │◄──────►│  Next.js App Router │
        │  routes          │        │  (dashboard, map,   │
        │  /api/search etc │        │   affordability)     │
        └────────┬─────────┘        └───────────────────┘
                 │
                 ▼
        ┌─────────────────┐
        │ Notifications    │
        │ Twilio / SendGrid│
        │ / Web Push       │
        └─────────────────┘
```

## Why this shape

- **Adapters produce a common `NormalizedListing`** (`src/types/listing.ts`)
  so aggregation, dedupe, scoring, and ranking never know which site a
  listing came from. Adding a sixth source is additive, not a rewrite.
- **The ingestion worker is the only writer.** API routes and pages only
  read from Postgres. This keeps request latency independent of how slow or
  flaky a given source is, and means a scraping failure can't take the site
  down.
- **Scoring happens once, at ingestion**, and is persisted (`qualityScore`,
  `scamRiskScore`, `scamFlags`, `totalMoveInCost` on `Listing`). Search
  requests re-rank/filter already-scored rows instead of recomputing scores
  per request.
- **Postgres is the system of record; Elasticsearch is a derived index.**
  The MVP queries Postgres directly (fine up to tens of thousands of
  listings). At scale, a change-data-capture job (or a write-through in the
  worker) keeps an ES index in sync for full-text + geo-radius queries under
  load. `src/lib/search.ts` is the seam where that swap happens -- it's the
  only place that knows how search queries are executed.

## Core data flow: a search request

1. User submits `SearchForm` → browser navigates to
   `/dashboard?city=...&maxRent=...&bedrooms=...`.
2. `app/dashboard/page.tsx` (a React Server Component) calls
   `runSearch()` directly -- no client-side fetch round-trip needed for the
   initial render.
3. `runSearch()` (`src/lib/search.ts`) queries `Listing` rows matching the
   coarse filters (city/zip/bedrooms/maxRent), maps them to `ScoredListing`,
   applies the remaining boolean filters (`applyFilters`), and produces both
   the overall cheapest-25 and per-category cheapest-25 (`buildRankings`).
4. The same `runSearch()` backs `GET /api/search` for client-side
   re-fetching (filter toggles, map radius changes) without a full page
   reload.

## Core data flow: ingestion (AI Rent Hunter)

`src/workers/rentHunter.ts`, run on a schedule:

1. `fetchAllListings()` calls every `legallyIntegrated` adapter in parallel
   (`Promise.allSettled` -- one source failing doesn't block the others).
2. `dedupeListings()` collapses the same unit posted to multiple sources
   (address+rent, or phone+bedrooms+rent when there's no address).
3. For each deduped listing: `scoreScamRisk()` and `scoreQuality()` run,
   then the row is upserted into `Listing`. A price drop or a first sighting
   appends to `PriceHistory`.
4. Borderline scam scores (50-79) get a second, qualitative opinion from
   Claude (`assessWithClaude`) -- logged for a human reviewer rather than
   auto-actioned, since heuristic false positives are expensive to a
   legitimate landlord.
5. New/cheaper listings matching an active `Alert` create an `AlertMatch`
   and fire the notification pipeline (SendGrid/Twilio, no-op without
   credentials).

## Entity model

See `prisma/schema.prisma` for the authoritative schema. Highlights:

- **`Listing`** is the canonical rental record. Money fields are integer
  cents to avoid float rounding. `totalMoveInCost` is precomputed so ranking
  is a single `ORDER BY`.
- **`Source`** tracks per-origin crawl health (`lastCrawledAt`,
  `robotsAllowed`, `rateLimitRps`) independent of the listings it produced.
- **`PriceHistory`** is append-only, one row per observed price change --
  this is what "detects rent reductions" and the listing-detail price chart
  read from.
- **`SavedSearch`** + **`Alert`** + **`AlertMatch`** model "notify me when
  X" as data instead of code: a saved search defines the match criteria, an
  alert defines the channel/trigger, and a match is the audit trail of what
  fired and when.
- **`CrawlRun`** is operational telemetry for the ingestion worker (seen
  vs. new counts, errors) -- what you'd check first if the dashboard looks
  stale.

## Authentication

Clerk is the intended provider (`.env.example`: `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`,
`CLERK_SECRET_KEY`). `src/lib/auth.ts` is a thin `requireUserId()` seam so
route handlers never import Clerk directly -- swapping in
`auth().userId` from `@clerk/nextjs/server` is a one-file change. `User.clerkId`
in the schema is the join key between Clerk's identity and RentRadar's
domain data (saved searches, alerts, income for the affordability calculator).

## AI usage

Two distinct AI touchpoints, intentionally kept separate:

1. **Deterministic scoring** (`scoreScamRisk`, `scoreQuality`) is plain
   TypeScript, not a model call -- explainable, fast, free, and testable
   with unit tests (`tests/rank.test.ts`).
2. **Claude as a second opinion** (`assessWithClaude` in
   `rentHunter.ts`) only runs on listings the heuristics already flagged as
   borderline, to reduce false positives on real landlords before a listing
   is hidden or a human reviews it. It never fabricates data used for
   ranking or contact info.

## Search index scaling path

MVP: Postgres with indexes on `(city, state, zipCode)`, `(category,
monthlyRent)`, and `(latitude, longitude)` -- adequate for a single metro or
a few, and for the seeded demo dataset.

Production: introduce Elasticsearch once either (a) query latency on the
Postgres table scan exceeds budget, or (b) true geo-radius + full-text
relevance ranking is needed. The worker double-writes to both stores, or a
Debezium/logical-replication CDC pipeline mirrors Postgres → ES so
`runSearch()`'s Postgres branch is swapped for an ES query without touching
callers.
