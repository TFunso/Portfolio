# QCOS - Quality Career Operating System

A production app for a Quality Technician II to capture daily work in under
30 seconds, automatically surface the hidden value in "just doing my job,"
track progress against annual goals, and generate evidence-based
performance review and promotion material.

QCOS answers one question: **"What evidence do I have that I made my team,
department, and business better?"**

Live app: deployed on Vercel (see the repo's deployment for the current URL).

---

## 1. Architecture

```
┌─────────────────────────────┐
│         Browser              │
│  Next.js App Router (React)  │
│  - Client components fetch   │
│    JSON from /api/* routes   │
│  - Tailwind CSS, dark mode   │
└───────────────┬──────────────┘
                │ fetch (JSON)
┌───────────────▼──────────────┐
│      Next.js Route Handlers   │
│  src/app/api/**/route.ts      │
│  - Validate input (zod)       │
│  - Call the classifier (lib)  │
│  - Read/write via Prisma      │
└───────────────┬──────────────┘
                │
┌───────────────▼──────────────┐
│   AI Achievement Detector     │
│   src/lib/classifier.ts       │
│   Deterministic keyword/rule  │
│   engine - offline, instant,  │
│   explainable. Same function  │
│   signature a hosted-LLM      │
│   classifier could replace.   │
└───────────────┬──────────────┘
                │
┌───────────────▼──────────────┐
│      Prisma ORM + Postgres    │
│   (Vercel Postgres in prod)   │
└────────────────────────────────┘
```

**Why a rules engine instead of a hosted LLM call?** The spec's
non-negotiable rule is that daily capture must take under 30 seconds and
never block on anything external. A local, deterministic classifier
returns an answer in milliseconds, works with zero API key or network
dependency, and is fully explainable ("why did this count?" always has a
traceable answer). `classifyEntry()` in `src/lib/classifier.ts` is the one
seam to swap in a real LLM later without touching any API route or UI code.

**Why Postgres instead of SQLite in production?** The original spec calls
for local-first SQLite. That's still true for local development (Prisma
just needs a `DATABASE_URL`). Once deployed to Vercel, though, serverless
functions get an ephemeral, per-invocation filesystem - a SQLite file
written by one request isn't guaranteed to exist for the next one, so data
would silently vanish. Postgres (via Vercel Postgres) is the smallest
change that keeps the exact same Prisma schema and app code working
reliably once it's live on the internet.

## 2. Database Schema

See [`prisma/schema.prisma`](./prisma/schema.prisma) for the source of
truth. Summary:

| Model | Purpose |
|---|---|
| `DailyEntry` | One brain-dump line. Fast capture, free text, timestamped. |
| `Classification` | 1:1 with `DailyEntry` - the AI Achievement Detector's output: counts (Y/N), reason, categories, departments touched, impact level, goal metrics matched, and generated professional summary. |
| `EvidenceRecord` | A saved, review-ready accomplishment (auto-filed from high-value entries, "Did This Count?" checks, monthly reflections, or added manually). |
| `GoalMetricEvent` | One occurrence toward a DRIVE EFFICIENCY metric (e.g. a No Inspect candidate). |
| `DidThisCountLog` | History of every ad-hoc "Did This Count?" check. |
| `MonthlyReflection` | The 3 answers to "what did you do that made someone else's job easier" for a given month, unique per (month, year). |

## 3. Wireframes (homepage)

```
┌──────────────────────────────────────────────────────────┐
│  QCOS   [Home] [Did This Count?] [Vault] [Goals] ...  🌙  │
├──────────────────────────────────────────────────────────┤
│  "What did you do today?"                                │
│  ┌────────────────────────────────────────────────────┐  │
│  │  (single large textbox, no forms, no categories)    │  │
│  └────────────────────────────────────────────────────┘  │
│                                          [ Log it ]        │
├──────────────────────────────────────────────────────────┤
│  ⬤ Promotion Readiness Snapshot        score ring + copy  │
├──────────────────────────────────────────────────────────┤
│  Goal Dashboard - DRIVE EFFICIENCY  (green/yellow/red)    │
├──────────────────────────────────────────────────────────┤
│  Things You Did That Counted This Week                   │
│  ✓ item · why it counted · impact · categories            │
├─────────────────────────┬──────────────────────────────────┤
│  Recent Daily Entries    │  Evidence Vault Highlights      │
└─────────────────────────┴──────────────────────────────────┘
```

Dedicated pages (`Did This Count?`, `Evidence Vault`, `Goals`,
`Cross-Functional`, `Reflection`, `Year-End Review`) follow the same card +
badge visual language, responsive down to a single column on mobile.

## 4. Folder Structure

```
qcos/
├── prisma/
│   ├── schema.prisma        # DB schema (Postgres)
│   └── seed.ts               # Sample data for local dev
├── src/
│   ├── app/
│   │   ├── page.tsx                    # Homepage (5 sections)
│   │   ├── layout.tsx                  # Nav, dark mode, shell
│   │   ├── did-this-count/page.tsx
│   │   ├── evidence-vault/page.tsx
│   │   ├── goals/page.tsx
│   │   ├── cross-functional/page.tsx
│   │   ├── reflection/page.tsx
│   │   ├── review/page.tsx             # December Review Generator
│   │   └── api/
│   │       ├── entries/route.ts        # Daily Brain Dump
│   │       ├── did-this-count/route.ts
│   │       ├── evidence/route.ts
│   │       ├── goals/route.ts
│   │       ├── cross-functional/route.ts
│   │       ├── reflection/route.ts
│   │       ├── review/route.ts
│   │       └── dashboard/route.ts      # homepage aggregate
│   ├── components/           # Presentational + form components
│   ├── lib/
│   │   ├── classifier.ts     # AI Achievement Detector
│   │   ├── goals.ts          # Annual goal + metric definitions
│   │   ├── evidence.ts       # Evidence-record generation
│   │   ├── dates.ts
│   │   ├── json.ts
│   │   └── prisma.ts
│   └── types/index.ts
└── package.json
```

## 5. Implementation Plan (as built)

1. Scaffold Next.js 14 (App Router) + TypeScript + Tailwind + Prisma.
2. Design the schema around "capture now, classify automatically."
3. Build the deterministic classifier (`classifyEntry`) and the "Did This
   Count?" evaluator that reuses it.
4. Build API routes: fast-write entries endpoint that classifies and
   auto-files evidence + goal events in the same request.
5. Build the homepage's 5 sections and the 6 dedicated feature pages.
6. Add dark mode (class-based, `localStorage` + system preference), full
   responsive layout.
7. Seed sample data, verify `next build` and `tsc --noEmit` are clean.
8. Provision Vercel Postgres, deploy, run `prisma migrate deploy` against
   production.

## 6. Local development

```bash
npm install
# point DATABASE_URL (in .env) at a local Postgres instance, e.g.:
#   docker run -e POSTGRES_PASSWORD=postgres -p 5432:5432 -d postgres
npx prisma migrate dev --name init
npm run db:seed   # optional sample data
npm run dev
```

Run `npm run typecheck` and `npm run build` before shipping changes.

## Feature map

| Spec feature | Where it lives |
|---|---|
| 1. Daily Brain Dump | `src/components/BrainDumpForm.tsx`, `POST /api/entries` |
| 2. AI Achievement Detector | `src/lib/classifier.ts` |
| 3. Did This Count? | `src/app/did-this-count/page.tsx`, `/api/did-this-count` |
| 4. Things You Did That Counted | `src/components/ThingsThatCounted.tsx` (homepage) |
| 5. Goal Dashboard | `src/app/goals/page.tsx`, `/api/goals` |
| 6. Evidence Vault | `src/app/evidence-vault/page.tsx`, `/api/evidence` |
| 7. Cross-Functional Impact Recognition | `src/app/cross-functional/page.tsx`, `/api/cross-functional` |
| 8. Monthly Reflection | `src/app/reflection/page.tsx`, `/api/reflection` |
| 9. December Review Generator | `src/app/review/page.tsx`, `/api/review` |
