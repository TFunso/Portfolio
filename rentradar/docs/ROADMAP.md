# Roadmap

## MVP (this scaffold)

- [x] Prisma schema covering listings, sources, price history, users, saved
      searches, alerts, crawl runs
- [x] Pluggable `SourceAdapter` architecture with 4 legally-clear adapters
      (mock, HUD affordable housing, Craigslist RSS [disabled pending legal
      sign-off], generic JSON-LD property-manager sites)
- [x] Dedupe, quality scoring, and anti-scam scoring as tested pure functions
- [x] Cheapest-overall + cheapest-per-category ranking by total move-in cost
- [x] Search, listing detail, and affordability API routes
- [x] Dashboard with filters, map (Mapbox, radius slider), ranking tabs,
      per-listing contact actions
- [x] Affordability calculator (UI + API)
- [x] AI Rent Hunter ingestion worker: dedupe → score → persist → detect
      rent drops/new listings → notify (Twilio/SendGrid stubs) → optional
      Claude second opinion on borderline scam scores
- [x] Unit tests for dedupe, ranking/filtering, and affordability math
- [x] Real radius search: freeform location geocoded via Mapbox, results
      filtered by great-circle distance (`src/lib/geo.ts`,
      `src/lib/geocoding.ts`) instead of exact city-string matching
- [x] Mock demo data spans 25 cities across 10 states so radius search has
      real listings to find nationally, not just one metro
- [x] Clerk auth wired into `src/lib/auth.ts`, `src/middleware.ts`, and
      sign-in/sign-up pages -- fully optional, the app runs signed-out with
      zero Clerk config exactly like every other integration here
- [x] Alerts UI (`/alerts`): create a saved search, attach "new match" /
      "rent drop" email alerts to it, see active alerts
- [x] Alert matching in the ingestion worker now geocodes each saved
      search's location once per run and matches by radius, consistent
      with the dashboard's search behavior
- [x] Scheduled ingestion via `.github/workflows/rent-hunter-cron.yml`
      (every 30 min once `DATABASE_URL` is set as a repo secret)

## Near-term (post-MVP)

- [ ] "Saved properties" and "Compare" trays backed by `SavedListing`
      (currently placeholder buttons in `ContactActions`)
- [ ] Push notifications (web push / FCM) for the `PUSH` alert channel
- [ ] Draw-your-own radius on the map (currently a slider around a point;
      add a Mapbox Draw polygon tool) and "near work / near school / near
      transit" presets
- [ ] University housing board adapters for specific schools once each
      board's terms are reviewed
- [ ] Real HUD/PHA endpoint wiring (the adapter is built; needs the actual
      endpoint + token from HUD USER or a specific PHA)
- [ ] Legal review + sign-off to flip `craigslistRssAdapter.legallyIntegrated`
- [ ] Admin view for `CrawlRun` history and `NEEDS_REVIEW` (high scam-score)
      listings
- [ ] Clerk webhook to sync `User` updates/deletes instead of the current
      lazy-create-on-first-sign-in

## Production hardening

- [ ] Elasticsearch introduction per `docs/ARCHITECTURE.md` once query
      volume warrants it
- [ ] Multi-metro `SEARCH_GRID` driven by live `SavedSearch` locations
      instead of a static list
- [ ] Queue-based ingestion (BullMQ/SQS) replacing the sequential worker
      loop, with per-source rate limiting enforced centrally
- [ ] Commercial data licenses: Apartments.com/CoStar, Zillow Bridge API,
      Realtor.com/Move, Zumper partner feed -- see
      `docs/LEGAL_AND_DATA_SOURCES.md` for what each requires
- [ ] Observability: structured logs + alerting on `CrawlRun.errors`,
      notification delivery failure rate, and scam-flag rate drift
- [ ] Load testing the search path at target metro scale
- [ ] Mobile app (React Native/Expo) against the existing `/api/*` contract
- [ ] SOC 2 / data handling review before onboarding paying B2B customers
      (e.g. property managers) who supply their own inventory feeds
