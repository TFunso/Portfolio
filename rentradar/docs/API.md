# API Reference

All endpoints are Next.js Route Handlers under `src/app/api/`. Responses are
JSON. Money amounts in requests are dollars (human-friendly); responses use
integer cents internally (`*Cents` fields) to stay precise -- format with
`(cents / 100)` in the UI.

## `GET /api/search`

Query params (all optional):

| Param | Type | Notes |
|---|---|---|
| `city` | string | case-insensitive exact match |
| `zipCode` | string | exact match |
| `maxRent` | number | dollars |
| `bedrooms` | number | minimum bedrooms |
| `petFriendly` | boolean | |
| `parkingAvailable` | boolean | |
| `furnished` | boolean | |
| `shortTermLease` | boolean | |
| `noCreditCheck` | boolean | |
| `lowDeposit` | boolean | |
| `utilitiesIncluded` | boolean | |
| `limit` | number | 1-100, default 25 |

Response:

```json
{
  "resultCount": 42,
  "cheapestOverall": [ScoredListing, ...],
  "cheapestByCategory": {
    "STUDIO": [ScoredListing, ...],
    "ONE_BEDROOM": [...],
    "TWO_BEDROOM": [...],
    "THREE_PLUS_BEDROOM": [...],
    "PRIVATE_ROOM": [...],
    "HOUSE_SHARE": [...],
    "ROOMMATE": [...]
  }
}
```

High-scam-risk listings (`scamRiskScore >= 50`) are excluded by default.

## `GET /api/listings/:id`

Returns one listing plus its price history.

```json
{
  "listing": ScoredListing,
  "priceHistory": [{ "monthlyRentCents": 145000, "recordedAt": "2025-11-01T00:00:00Z" }]
}
```

404 if not found.

## `POST /api/affordability`

Request body:

```json
{
  "annualIncome": 50000,
  "monthlyRent": 1200,
  "securityDeposit": 1200,
  "applicationFee": 50,
  "otherMoveInFees": 0,
  "utilitiesIncluded": false,
  "estimatedMonthlyUtilities": 150,
  "estimatedMonthlyTransit": 100
}
```

Only `annualIncome` and `monthlyRent` are required. Response is an
`AffordabilityResult` (see `src/lib/affordability/calculator.ts`):
`recommendedMaxRentCents`, `rentToIncomeRatio`, `totalMoveInCostCents`,
`totalMonthlyHousingCostCents`, `affordabilityScore` (0-100), and `band`
(`comfortable` | `tight` | `stretched` | `unaffordable`).

## `GET /POST /api/saved-searches`

Requires `x-rentradar-user-id` header (stand-in for Clerk session until
auth is wired in -- see `src/lib/auth.ts`).

`POST` body:

```json
{
  "name": "Near downtown, under $1500",
  "location": "Columbus",
  "radiusMiles": 5,
  "maxRent": 1500,
  "minBedrooms": 1,
  "moveInDate": "2026-01-01T00:00:00Z",
  "filters": { "petFriendly": true }
}
```

## `GET /POST /api/alerts`

Requires `x-rentradar-user-id` header.

`POST` body:

```json
{
  "savedSearchId": "clxyz...",
  "channel": "EMAIL",
  "triggerType": "RENT_DROP"
}
```

`channel`: `EMAIL` | `SMS` | `PUSH`. `triggerType`: `NEW_CHEAPER_LISTING` |
`RENT_DROP` | `AVAILABILITY_CHANGE` | `LANDLORD_RESPONSE` | `NEW_MATCH`.

## Error shape

Validation errors return `400` with `{ "error": <zod flatten() output> }`.
Auth failures return `401` with `{ "error": "Unauthorized" }`. Not-found
returns `404` with `{ "error": "..." }`.
