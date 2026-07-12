# Place Model & Encounter Design

**Date:** 2026-07-12
**Status:** Approved design, ready for planning

## Problem

The data model can say *who* recommended a place (`Post.referredBy → Person`) and *how* a
person entered the circle (`Person.metVia → person | post`), but it cannot cleanly express
**where we met someone**:

> Tom, the bartender at *Torch Club* in Denver, recommended *Shady Lady* in Sacramento.

Today "where we met Tom" has no structured home — only free-text `Person.note`, or overloading
`metVia → post` (which forces the encounter spot to be a full write-up even when it isn't one).

Two further weaknesses surfaced while modeling this:

1. **`metVia: [people, posts]` conflates two different facts** — *"someone introduced me"* (a human
   referral link) vs. *"I met them at that place"* (a location). One field wearing two meanings.
2. **The geographic hierarchy is too rigid.** `City → Country` can express "Tokyo, Japan" but not
   "Sacramento, CA" — there's no room for a state/province, and only some places have one.

## Core idea: a first-class `Place`

A **Place** is a specific spot on the map — a bar, a restaurant, a wedding venue, an airport lounge.
It owns the identity and the pin.

- A **Post is a Place you wrote up.**
- An **incidental spot is a Place nobody wrote up** (a wedding, a friend's kitchen).

Because both are the same concept, the encounter chain works without duplicating anything: the bartender
*at* one of your recommendations sends you to the next one, and every hop is a Place.

> **Torch Club, Denver** (Place, has a Post) → *Tom* → **Shady Lady, Sacramento** (Place, has a Post)

## Geographic hierarchy

A single **optional** `Region` level between Country and City. Cities always keep a required `country`;
`region` is filled only where it applies.

```
Country (Japan, USA)
  └─ Region      optional   (California — code "CA")     ← only where it applies
       └─ City   (Sacramento)      City.country required, City.region optional
            └─ Place (Torch Club)
```

- "Sacramento, CA" renders from `city.region`; "Tokyo" simply has no region.
- **Routing is unchanged** for this pass: URLs stay `/[year]/[country]/[city]/[slug]`. `Region` is
  display / disambiguation metadata, not a URL segment. Promoting it to `/country/region/city` is a
  future option, out of scope here.

## Collections

### New: `Places`

| Field    | Type                        | Notes                                  |
|----------|-----------------------------|----------------------------------------|
| name     | text, required              | "Torch Club"                           |
| slug     | slug (from name)            |                                        |
| location | `locationField()`           | Maps link → pin + placeName (optional) |
| city     | relationship → cities       | optional                               |
| note     | text, optional              | "the one on 6th Ave"                   |

Reuses the existing `locationField()` machinery (Maps link → lat/lng via `resolveLocation`), so the
map side needs nothing new.

### New: `Regions`

| Field   | Type                       | Notes                    |
|---------|----------------------------|--------------------------|
| name    | text, required             | "California"             |
| code    | text, optional             | "CA"                     |
| slug    | slug (from name)           |                          |
| country | relationship → countries   | required                 |

### Changed: `Cities`

- **Add** `region → regions` (optional).
- **Keep** `country → countries` (required) — unchanged, still drives routing.

### Changed: `Posts`

- **Add** `place → places` (relationship, **required**). A Post is always about a Place.
- **Remove** the inline `location` group — the pin now lives on the Post's Place.
- **Remove** the `city` relationship — city is derived from `post.place.city`, rolled up to
  `post.place.city.country`.
- Update all readers (~14 files: routing pages, `Breadcrumbs`, `PostCard`, `PostList`, `Stats`,
  `LocationCard`, `Rail`, `HeroTagline`, `queries.ts`, `revalidate.ts`) to read `post.place.city`
  instead of `post.city`, and `post.place.location` instead of `post.location`.

### Changed: `People`

Replace `metVia` with three sharp, all-optional facts:

| Field       | Type                      | Meaning                    |
|-------------|---------------------------|----------------------------|
| metAt       | relationship → places     | where you met them         |
| metThrough  | relationship → people     | who introduced you         |
| metOn       | date                      | when                       |

`metAt → Place` handles both cases with one field (a Post-backed Place *or* an incidental Place).
`metThrough` is now separate, so both can coexist: *"Sarah introduced me to Tom, at that wedding."*

## How it surfaces

All three views read the same underlying facts:

- **Person profile / credit** — a caption wherever a person is shown:
  *"Met at Torch Club, Denver · Jul 2024"* (from `metAt → place → city/region` and `metOn`);
  *"introduced by Sarah"* when `metThrough` is set.
- **Map** — a Place carries `location`, so incidental encounter spots drop pins just like Posts do.
  `LocationCard` reads `post.place.location`. Denver and Sacramento both pin and can be drawn as a hop.
- **Word-of-mouth graph** — nodes are Places and People; edges are `Post.referredBy` and
  `Person.metAt`. The chain `Torch Club → Tom → Shady Lady` is a plain traversal, no special-casing.

## Data reset (no migration)

The database is test-only, so **reset and reseed** rather than migrate. Reshape the seed to produce
the new model:

Countries → some Regions (California) and some without (Japan) → Cities → Places → Posts (each
`place`-linked, `referredBy` where apt) → People with `metAt` / `metThrough` / `metOn` wired to form
**at least one full `Place → Person → Place` chain** so the graph and captions have real data to render.

## Testing

- **Pure helpers first** — any city/region label formatting ("Sacramento, CA" vs. "Tokyo"), and any
  graph-traversal helper, updated for the `metVia`-gone / `Place`-based edges.
- **Integration** — a seeded chain resolves end-to-end: a Post → its Place → City → Region/Country,
  and a `Place → Person → Place` referral chain.
- Regenerate `payload-types.ts`; confirm typecheck and lint pass.

## Consciously deferred (YAGNI)

- `Region` in the URL (`/country/region/city`) — display-only for now.
- Auto-resolving city/region/country from a pasted Maps link — the `City`/`Region` relationships are
  the source of truth; the Maps link stays a pin convenience, not a geocoder for admin areas.
- Multiple encounters per person — the model holds one origin-encounter per person (`metAt` is single).
