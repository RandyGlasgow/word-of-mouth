---
name: verify
description: Build, seed, launch, and drive the Word of Mouth app (Next.js + Payload + Postgres) to verify changes end-to-end.
---

# Verifying Word of Mouth

## Prereqs
- Postgres: `docker compose up -d` (creates `word_of_mouth` + `word_of_mouth_test`; extra test DBs `_test_a`/`_test_c` exist for parallel agents).
- pnpm via `npx pnpm@10 <cmd>` (no global pnpm 10 installed).

## Seed + launch
```bash
set -a && source .env && set +a && npx pnpm@10 exec tsx scripts/seed.ts   # tsx does NOT auto-load .env
npx pnpm@10 dev   # port 3000; readiness: curl -sf http://127.0.0.1:3000/
```
Seed gives: admin@example.com / password, 8 published posts over 2025–2026, 1 draft (`/2026/portugal/lisbon/draft-notes-from-sintra` must 404 publicly).

## Flows worth driving
- Aggregations: `/`, `/2025`, `/2025/portugal`, `/2025/portugal/lisbon`, post `/2025/portugal/lisbon/the-alfama-bar-with-no-sign`, `/authors/randy`.
- Post page: breadcrumbs, byline, "Suggested by" rail card, "N views", "More from <city>", reserved ad slot. View count streams via Suspense — grep the flight payload (`view-count`) not just visible text.
- Views API: `POST /api/views/<id>` → 204 + `wom_uid` cookie on first hit; same cookie twice → still one row (`select count(*) from post_views where post_id=<id>` via `docker compose exec postgres psql -U wom -d word_of_mouth`). GET → 405; bad/missing id → 404; `/api/post-views` anon → 403.
- Hierarchy is validated, not just slug lookup: a real post under the wrong year/country/city must 404.

## Gotchas
- URL year segments derive from `publishedDate` in **UTC**.
- `next dev` auto-appends to tsconfig `include` — expected noise in git status.
- Tests (`npx pnpm@10 test:int`) boot their own server on 3210 with `test.env`; shell env overrides for parallel runs.
