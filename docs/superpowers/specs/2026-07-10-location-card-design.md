# Location Card in Post Rail — Design

**Date:** 2026-07-10
**Status:** Approved

## Goal

Show a small map in the post page's right-hand Rail that pinpoints the specific
place a post is about (falling back to the city), with a link out to Google
Maps. Total running cost must be $0 — no API keys, no Google Cloud account.

## Decisions made during brainstorming

- **Location lives on both Posts and Cities.** Post-level location wins when
  present; city coordinates are the fallback.
- **Rendering: interactive mini-map with free tiles** (Leaflet +
  OpenStreetMap raster tiles), not a Google Maps embed iframe and not a
  link-only card. The Google Embed API was verified to be $0/unlimited, but it
  requires a Google Cloud project + API key and carries branding/weight
  downsides; the free-tile mini-map avoids all of that.
- **Admin entry: paste a Google Maps link.** A hook parses coordinates (and
  place name when possible) out of the pasted URL. No manual lat/lng typing,
  no geocoding service.
- **Verification includes a visual browser check** of the rendered component,
  not just automated tests.

## Data model

A shared `location` group field added to **Posts** and **Cities**:

| Field       | Type    | Notes                                                        |
| ----------- | ------- | ------------------------------------------------------------ |
| `mapsUrl`   | text    | Pasted Google Maps URL (full or `maps.app.goo.gl` short link) |
| `placeName` | text    | e.g. "Café Central"; prefilled from the URL when parseable    |
| `point`     | point   | `[lng, lat]`; auto-populated by the hook, hand-editable       |

All fields optional. The group is defined once in `src/fields/` (following the
`slugField` pattern) and reused by both collections.

### URL parsing hook

A `beforeChange` hook on the group's parent collections:

- Parses coordinates from the common Google Maps URL shapes:
  - `.../@<lat>,<lng>,<zoom>z/...`
  - `?q=<lat>,<lng>` and `?query=<lat>,<lng>`
  - `!3d<lat>!4d<lng>` data segments (place pins — preferred over `@` when
    both are present, since `@` is the viewport center, not the pin)
- For `maps.app.goo.gl` / `goo.gl/maps` short links: resolve the redirect
  server-side (single `fetch` with `redirect: 'manual'`), then parse the
  resolved URL.
- Prefills `placeName` from the `/maps/place/<name>/` path segment
  (URL-decoded, `+` → space) only when `placeName` is empty.
- Only runs when `mapsUrl` changed; never overwrites a hand-edited `point`
  unless the URL changed.
- An unparseable URL throws a validation error with a helpful message
  ("Couldn't find coordinates in this link — paste the full URL from your
  browser's address bar").

The parser itself is a pure function in `src/lib/` so it can be unit tested
without Payload.

## Fallback logic

The post page resolves `post.location ?? post.city.location` (a location
counts as present when it has a `point`) and passes it to the Rail. If
neither has a point, the card does not render.

## Rendering

New Rail section `LocationCard`:

- **Map:** Leaflet (~42KB gzip) in a client component, loaded via
  `next/dynamic` with `ssr: false` (Leaflet touches `window`). ~180px tall,
  single marker at `point`, zoom ~15 for post locations / ~11 for city
  fallback, scroll-wheel zoom disabled (it's in a sidebar), pan/zoom via
  controls.
- **Tiles:** OpenStreetMap standard raster tiles with proper attribution.
  Acceptable under the OSM tile usage policy at personal-journal traffic. The
  tile URL template lives in one constant so the provider can be swapped
  later without touching the component.
- **Styling:** matches the existing `rail__card` treatment (label, border
  radius, typography from `styles.css`).
- **Below the map:** `placeName` (when present) and an
  **"Open in Google Maps ↗"** link — `mapsUrl` verbatim when available
  (preserves the exact place page), otherwise
  `https://www.google.com/maps/search/?api=1&query=<lat>,<lng>`.
  Opens in a new tab.

## Error handling

- Bad pasted URL → admin validation error (see hook above).
- Location group with URL but no point (e.g. legacy data) → card renders
  link-only, no map.
- Tile server unreachable → Leaflet shows a blank/gray map; the Google Maps
  link still works. No custom handling.

## Testing

- **Unit:** the URL parser, one case per supported URL shape plus rejection
  cases (non-Google URL, URL with no coordinates).
- **Integration (Local API, existing patterns):** creating/updating a post or
  city with a `mapsUrl` populates `point` and `placeName`; hand-edited point
  survives an unrelated update; invalid URL rejects with validation error.
- **Visual:** run the app via the project `verify` skill, open a seeded post
  in the browser, and confirm the map renders with a marker and the Google
  Maps link opens the right place. This is a required completion gate, not
  optional.

## Out of scope (YAGNI)

- Geocoding/search-box entry in the admin
- Multiple locations per post
- Maps on aggregation pages (city/country listing maps)
- Custom map themes or vector tiles (MapLibre) — revisit only if the raster
  look clashes with the design
