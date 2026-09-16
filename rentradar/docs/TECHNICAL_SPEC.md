# RentRadar Technical Specification

## 1. Product goal

Help users find the cheapest legitimate rental within a chosen radius,
aggregated across traditional marketplaces and alternative sources,
ranked by **total move-in cost** (not sticker rent), with direct contact
info and anti-scam screening.

## 2. Scope of this implementation

This repository ships a working MVP scaffold plus the full production
architecture. It intentionally does **not** ship scrapers for sites whose
Terms of Service prohibit automated access without a partnership
(Apartments.com, Zillow, Rent.com, Realtor.com, Facebook Marketplace,
PadMapper, HotPads, Zumper, RentCafe) -- see `docs/LEGAL_AND_DATA_SOURCES.md`
for the status of every named source and exactly what obtaining each one
requires. What *is* fully implemented:

- The `SourceAdapter` interface every one of those sources will eventually
  plug into.
- Two legally-clear live-data adapters (HUD affordable housing via an
  official/open-data endpoint, and a generic JSON-LD reader for property
  management sites that publish structured data and permit crawling per
  `robots.txt`), plus a Craigslist RSS adapter shipped disabled pending
  legal sign-off, plus a mock adapter for demos/tests.
- The entire aggregation → scoring → ranking → search → alerting →
  notification pipeline, end to end, on real (if currently mock/limited)
  data.

## 3. Folder structure

```
rentradar/
├── docs/                        # this technical spec, architecture, API, deployment, roadmap, revenue, legal
├── prisma/
│   ├── schema.prisma             # full data model
│   └── seed.ts                   # loads mock data for local dev
├── src/
│   ├── app/
│   │   ├── layout.tsx
│   │   ├── page.tsx               # landing + search form
│   │   ├── globals.css
│   │   ├── dashboard/page.tsx     # results, ranking tabs, map, filters
│   │   ├── listing/[id]/page.tsx  # listing detail + price history
│   │   ├── affordability/page.tsx # affordability calculator page
│   │   └── api/
│   │       ├── search/route.ts
│   │       ├── listings/[id]/route.ts
│   │       ├── affordability/route.ts
│   │       ├── alerts/route.ts
│   │       └── saved-searches/route.ts
│   ├── components/
│   │   ├── SearchForm.tsx
│   │   ├── FiltersPanel.tsx
│   │   ├── RankingTabs.tsx
│   │   ├── ListingCard.tsx
│   │   ├── ContactActions.tsx
│   │   ├── MapView.tsx
│   │   └── AffordabilityCalculator.tsx
│   ├── lib/
│   │   ├── sources/
│   │   │   ├── types.ts                 # SourceAdapter interface
│   │   │   ├── registry.ts              # active adapter list + fan-out fetch
│   │   │   └── adapters/
│   │   │       ├── mockAdapter.ts
│   │   │       ├── hudAffordableHousingAdapter.ts
│   │   │       ├── craigslistRssAdapter.ts
│   │   │       └── jsonLdSiteAdapter.ts
│   │   ├── aggregation/
│   │   │   ├── dedupe.ts
│   │   │   ├── rank.ts
│   │   │   ├── scam.ts
│   │   │   ├── qualityScore.ts
│   │   │   └── fromDb.ts
│   │   ├── affordability/calculator.ts
│   │   ├── notifications/{email,sms}.ts
│   │   ├── robots.ts               # robots.txt compliance checker
│   │   ├── db.ts                   # Prisma client singleton
│   │   ├── auth.ts                 # Clerk seam
│   │   └── search.ts               # shared search logic (API + server component)
│   ├── types/listing.ts            # NormalizedListing / ScoredListing
│   └── workers/rentHunter.ts       # AI Rent Hunter ingestion agent
├── tests/                          # vitest unit tests for the pure logic
├── package.json / tsconfig.json / tailwind.config.ts / next.config.js
└── .env.example
```

## 4. Database schema

Authoritative source: `prisma/schema.prisma`. See `docs/ARCHITECTURE.md`
for the entity narrative.

## 5. API endpoints

See `docs/API.md`.

## 6. UI overview (mockup description)

- **Landing (`/`)**: hero + `SearchForm` (location, max budget, move-in
  date, bedrooms) + three feature callouts (cheapest-first ranking,
  affordable housing built in, anti-scam screening).
- **Dashboard (`/dashboard`)**: result count header, `MapView` (pins +
  draggable radius circle, degrades to a text placeholder without a Mapbox
  token), a left `FiltersPanel` (pet friendly, parking, furnished,
  short-term, no credit check, low deposit, utilities included), and
  `RankingTabs` (Cheapest Overall / Studio / 1BR / 2BR / Roommates /
  Private Room / House Share) rendering `ListingCard`s.
- **Listing card**: address, rent, total move-in cost, bed/bath/sqft,
  deposit, availability, source, quality score, scam-risk score, property
  manager + office hours, and the lead-gen action row: **Call Now / Send
  Email / Visit Listing / Save Property / Compare**.
- **Listing detail (`/listing/[id]`)**: full card, map centered on the
  listing, price history, and anti-scam flags if any were raised.
- **Affordability calculator (`/affordability`)**: income + rent inputs →
  recommended max rent, rent-to-income ratio, utilities/transit estimates,
  total monthly housing cost, total move-in cost, and a 0-100 affordability
  score with a comfortable/tight/stretched/unaffordable band.

## 7. Implementation plan / Claude Code task breakdown

This is exactly how this scaffold was built, in dependency order -- reuse
this breakdown for the next slice of work:

1. App config (Next.js, Tailwind, TypeScript, env template)
2. Prisma schema + seed data
3. Source adapter interface + registry + robots.txt checker + adapters
4. Aggregation: dedupe → quality score → scam score → ranking, with unit
   tests
5. Affordability calculator (pure function + test) + API route
6. Remaining API routes (search, listing detail, alerts, saved searches)
7. Frontend pages + components (landing, dashboard, listing detail,
   affordability page)
8. Notifications (Twilio/SendGrid stubs) + AI Rent Hunter worker
   (ingestion, dedupe, scoring, persistence, alerting, Claude second
   opinion)
9. Docs suite (this file + architecture/API/deployment/roadmap/revenue/legal)
10. Typecheck, unit tests, build verification

## 8. Explicitly out of scope for this scaffold

- Live scraping of any ToS-prohibited source (see `LEGAL_AND_DATA_SOURCES.md`)
- Clerk/Twilio/SendGrid/Mapbox/Anthropic live credentials (the app runs
  fully without them; each integration point is a documented seam)
- A production Elasticsearch cluster (Postgres serves the MVP; the swap
  point is documented and isolated to `src/lib/search.ts`)
- Native mobile app (the API contract is mobile-ready; no client was built)
