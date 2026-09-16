# Legal & Data Sources

RentRadar's product brief names specific marketplaces (Apartments.com, Zillow,
Rent.com, Realtor.com, Craigslist, Facebook Marketplace, PadMapper, HotPads,
Zumper, RentCafe) plus "direct landlord" discovery via scraping local sites.
The brief also states the constraint that governs all of it:

> Use only legal and compliant methods. Prefer official APIs, licensed data
> providers, RSS feeds, public datasets... Respect robots.txt, terms of
> service, rate limits.

This document is the source-by-source status that constraint produces. It's
why `src/lib/sources/registry.ts` ships four adapters instead of fifteen: the
rest require a business step (a signed data license or partner API
agreement) that a code change can't substitute for.

## Status per source named in the brief

| Source | ToS position (as of 2025) | RentRadar status |
|---|---|---|
| Apartments.com | Scraping prohibited; no self-serve public API | **Not integrated.** Requires a CoStar/Apartments.com data partnership. |
| Zillow Rentals | Scraping prohibited by ToS; Zillow offers the **Bridge Interactive API** to MLS/IDX partners only | **Not integrated.** Requires Bridge API partner approval. |
| Rent.com | Owned by CoStar; same posture as Apartments.com | **Not integrated.** |
| Realtor.com rentals | Scraping prohibited; Realtor.com/Move Inc. offer licensed data feeds to approved partners | **Not integrated.** Requires a Move Inc. data license. |
| Craigslist housing | ToS requires written permission for automated/commercial use; **does** publish an official RSS feed on search-results pages for personal use | **Adapter shipped, disabled by default** (`craigslistRssAdapter`, `legallyIntegrated: false`). Flip the flag only after Craigslist grants commercial permission. |
| Facebook Marketplace | Platform Terms prohibit scraping; Marketplace has no public listings API | **Not integrated. Explicitly out of scope** -- "where legally accessible" in the brief is not satisfied by scraping this surface. |
| PadMapper | Aggregator with no public API; ToS prohibits scraping | **Not integrated.** |
| HotPads | Owned by Zillow Group; same posture as Zillow | **Not integrated.** |
| Zumper | No public self-serve API; enterprise data partnerships exist | **Not integrated.** Contact Zumper's partnerships team for a feed. |
| RentCafe | Yardi product; site-specific ToS, generally no public API | **Not integrated.** |
| Local property management sites | Many mark up vacancy pages with schema.org JSON-LD for SEO -- that's public, intentionally-published data | **Adapter shipped** (`jsonLdSiteAdapter`): checks `robots.txt` per request, only crawls sites explicitly added to `PROPERTY_MANAGER_SITE_URLS`. |
| Affordable housing databases (HUD, PHAs) | HUD USER publishes open datasets; many PHAs run public listing feeds | **Adapter shipped** (`hudAffordableHousingAdapter`), pointed at a configured official endpoint; no-ops until `HUD_AFFORDABLE_HOUSING_ENDPOINT`/`HUD_API_TOKEN` are set. |
| University housing boards | Access varies by school; several expose public RSS/JSON | Same `jsonLdSiteAdapter`/RSS pattern applies per school once each board's terms are checked. Not pre-configured for any specific school. |
| Room rental platforms (e.g. SpareRoom, Roomster) | Some offer partner/affiliate feeds | Not integrated in this scaffold; follow the same adapter interface once a feed is licensed. |
| Public rental feeds / open data / RSS | Fair game by construction | Primary path for new adapters; add via `SourceAdapter`. |

## What this means for "Multi-Source Rental Search"

The **adapter interface** (`src/lib/sources/types.ts`) and **registry**
(`src/lib/sources/registry.ts`) are built so every source above becomes a
drop-in `SourceAdapter` the moment its legal status changes -- same
`NormalizedListing` output, same dedupe/ranking/scoring pipeline, no changes
needed elsewhere in the app. Turning on a new commercial source is:

1. Get the license/API key.
2. Implement `SourceAdapter.fetchListings()` for it (a few dozen lines,
   following `hudAffordableHousingAdapter.ts` as a template).
3. Set `legallyIntegrated: true` and add it to `allAdapters`.

## Anti-scraping technical safeguards already in place

- `src/lib/robots.ts` parses and enforces `robots.txt` (user-agent-specific
  `Disallow`/`Allow`, and `Crawl-delay`) before any direct site fetch.
- Every adapter sets an identifying `User-Agent` (`RentRadarBot/1.0
  (+contact@rentradar.app)`) rather than spoofing a browser.
- `Source.rateLimitRps` in the Prisma schema caps per-source request rate;
  the ingestion worker (`src/workers/rentHunter.ts`) is the only thing that
  calls adapters, so rate limiting lives in one place.
- Disabled-by-default (`legallyIntegrated: false`) is the mechanism for
  "needs a human legal sign-off before this runs in production" -- it is not
  a feature flag for something else.

## Data retention & takedown

- `Listing.removedAt` / `status: REMOVED` let a source's takedown request
  (or a landlord's own removal) propagate without a hard delete, preserving
  audit history in `PriceHistory` and `CrawlRun`.
- Contact information (phone/email) sourced from a public listing is
  displayed for its stated purpose (contacting about that rental) and is not
  resold or used for unrelated outreach -- keep this consistent with each
  source's ToS and with CAN-SPAM/TCPA if RentRadar ever contacts landlords
  directly.
