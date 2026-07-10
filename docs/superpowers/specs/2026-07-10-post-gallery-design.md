# Post Image Gallery Upgrade — Design

**Date:** 2026-07-10
**Status:** Approved

## Goal

Post images currently render as plain `<img>` tags — a full-width cover plus a
uniform auto-fill CSS grid for the gallery. Upgrade them to (a) `next/image`
for optimization/lazy-loading and (b) a masonry layout whose tiles open a
fullscreen lightbox, replacing the scroll grid.

## Decisions

- **Libraries:** `react-photo-album` (masonry layout) + `yet-another-react-lightbox`
  (fullscreen viewer). Same author, documented integration with each other and
  with `next/image`. Both support React 19 / Next 16.
- **Layout mode:** Masonry (columns), aspect ratios preserved.
- **Cover joins the set:** clicking the cover opens the lightbox at slide 0;
  gallery tile *n* opens at slide *n+1*.
- **All post imagery moves to `next/image`**, including the `Rail.tsx` author
  avatar and the shared `Cover.tsx` component.

## Architecture

### New component: `src/components/PostGallery.tsx` (client)

The only new client boundary.

- Props: `photos: GalleryPhoto[]` where
  `GalleryPhoto = { url: string; alt: string; width: number; height: number }`
  — the existing `mediaInfo()` shape with dimensions required. First photo is
  the cover.
- Renders:
  1. The cover as the existing full-width `.cover` figure via `next/image`,
     clickable.
  2. A `MasonryPhotoAlbum` of the remaining photos, using react-photo-album's
     render override so every tile is `next/image` (lazy, responsive `sizes`).
  3. One shared YARL `Lightbox` over the whole set — keyboard nav, swipe,
     Esc/backdrop close, preloading come free. YARL CSS imported in the
     component with a few overrides to match the site palette (backdrop,
     close button).
- Photos without stored dimensions are skipped (masonry requires aspect
  ratios). Payload always stores dimensions for uploaded images, so in
  practice nothing is dropped.

### Page change: `src/app/(site)/[year]/[country]/[city]/[slug]/page.tsx`

Build `photos = [cover, ...gallery]` (filtered through `mediaInfo`, dropping
nulls and dimensionless entries) and render `<PostGallery photos={photos} />`
in place of the current `<Cover>` + `.gallery` grid. Posts with no images
render nothing, same as today. The page stays a server component.

### Other components

- `Cover.tsx`: stays for non-post use; `<img>` → `next/image`.
- `Rail.tsx`: avatar `<img>` → `next/image`.

### CSS (`src/app/(site)/styles.css`)

- Delete the `.gallery` grid rules; keep `.cover`.
- Add tile hover affordance (subtle scale, pointer cursor) and lightbox theme
  overrides.

### Config

No change. `next.config.ts` already whitelists `/api/media/file/**` via
`images.localPatterns`.

## SSR

Masonry heights are computed client-side but react-photo-album v3 supports
SSR defaults, so no layout flash.

## Error handling

- Missing/unpopulated media relationships: already handled by `mediaInfo()`
  returning null; filtered out.
- Missing dimensions: skipped from the gallery (see above).
- Zero photos: component renders nothing.

## Testing & verification

- Data layer unchanged — existing integration tests untouched.
- Verification: production build passes, plus visual check of the seeded
  Alfama post (has a gallery) on the dev server: masonry layout, lightbox
  open/navigate/close, cover click opens slide 0.
