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

## Near-term (post-MVP)

- [ ] Clerk auth wired into `src/lib/auth.ts` and a real sign-in flow
- [ ] "Saved properties" and "Compare" trays backed by `SavedListing`
      (currently placeholder buttons in `ContactActions`)
- [ ] Push notifications (web push / FCM) for the `PUSH` alert channel
- [ ] Draw-your-own radius on the map (currently a slider around a point;
      add a Mapbox Draw polygon tool) and "near work / near school / near
      transit" presets geocoded via Mapbox Geocoding API
- [ ] University housing board adapters for specific schools once each
      board's terms are reviewed
- [ ] Real HUD/PHA endpoint wiring (the adapter is built; needs the actual
      endpoint + token from HUD USER or a specific PHA)
- [ ] Legal review + sign-off to flip `craigslistRssAdapter.legallyIntegrated`
- [ ] Admin view for `CrawlRun` history and `NEEDS_REVIEW` (high scam-score)
      listings

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
