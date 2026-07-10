# PRD: Word of Mouth — travel blog on Payload CMS

Status: ready-for-agent
Date: 2026-07-10

## Problem Statement

I travel, and the best things I find come from people — a bartender's tip, a friend's must-see list. Today those write-ups and the trail of who suggested what live nowhere. I want a single place to publish travel write-ups, browse them naturally by when and where they happened, credit the people whose suggestions led me there, and see which posts readers actually look at — without running heavyweight blog infrastructure.

## Solution

"Word of Mouth": a multi-author travel blog built as a single Next.js application with Payload CMS embedded. Write-ups are published under hierarchical URLs — `/<year>/<country>/<city>/<slug>` — and every prefix of that URL is a browsable aggregation page (all posts that year; that year in a country; that year in a city). Each post credits the person who suggested it, drawn from a People collection whose "met via" links form the data for a future referral graph. Anonymous unique-visitor view counts are tracked in a side table via a UUID cookie, never written onto the post itself. The design is warm and global: paper backgrounds, brown ink, pink and green accents, two characterful non-default typefaces, and a right-hand rail for auxiliary content and future ads — with visual separation built from spacing and typography, not box shadows.

## User Stories

### Reading & navigation

1. As a reader, I want to see recent write-ups on the home page, so that I can immediately find fresh content.
2. As a reader, I want to browse by year at `/<year>`, so that I can see everywhere the authors traveled that year.
3. As a reader, I want the year page grouped by country, so that I can scan the year's travels geographically.
4. As a reader, I want to browse `/<year>/<country>`, so that I can see all write-ups from that country that year.
5. As a reader, I want the country page to show the country's intro blurb and cover image, so that the page has character beyond a bare list.
6. As a reader, I want the country page grouped by city, so that I can drill into a specific place.
7. As a reader, I want to browse `/<year>/<country>/<city>`, so that I can see every write-up from that city that year.
8. As a reader, I want breadcrumbs on every level (post, city, country, year), so that I can move up the hierarchy without editing the URL.
9. As a reader, I want each aggregation page to show summary stats (post count, places covered), so that I get a sense of scale at a glance.
10. As a reader, I want to read a full write-up at `/<year>/<country>/<city>/<slug>`, so that I get the complete story with images.
11. As a reader, I want to see who suggested the place ("suggested by …") on a post, so that I understand the word-of-mouth trail.
12. As a reader, I want to see the post's author byline, so that I know whose voice I'm reading.
13. As a reader, I want an author page listing an author's posts, so that I can follow writers I like.
14. As a reader, I want a right-hand rail on post pages with auxiliary info (author card, suggested-by card, view count, more from this city), so that context is available without cluttering the article.
15. As a reader on a phone, I want the rail content to stack below the article, so that the layout works on small screens.
16. As a reader, I want pages to load fast, so that browsing feels instant.

### Authoring

1. As an author, I want to log in to an admin panel, so that I can write and manage my posts.
2. As an author, I want to create a post with title, rich text body, excerpt, cover image, gallery, and publish date, so that I can tell the full story.
3. As an author, I want to pick the post's city from existing cities, so that the post lands in the right place in the hierarchy.
4. As an author, I want to create a new city (and country) inline while writing, so that a first visit somewhere doesn't block publishing.
5. As an author, I want to credit a person from the People collection as the referrer, so that suggestions are attributed.
6. As an author, I want the referrer to be optional, so that self-discovered finds don't require a fake person.
7. As an author, I want to create a new person inline (name, note like "bartender in Lisbon", optional photo), so that crediting someone new is frictionless.
8. As an author, I want to record how I met a person (via another person, or via a post/trip), so that the referral chain is captured for the future graph.
9. As an author, I want to save drafts and publish when ready, so that unfinished work stays private.
10. As an author, I want the post's author to default to me, so that I don't have to set it manually.
11. As an author, I want to edit or delete only my own posts, so that I can't accidentally damage a co-author's work.
12. As an author, I want a profile (name, avatar, short bio), so that my byline and author page look complete.

### Administration

1. As an admin, I want to manage all posts regardless of author, so that I can moderate and fix anything.
2. As an admin, I want to invite/manage users and assign roles (admin, author), so that new co-authors can join.
3. As an admin, I want exclusive edit/delete rights over Countries, Cities, and People, so that the shared taxonomy stays clean while authors can still add to it.
4. As an admin, I want a published post to appear on the site (and its year/country/city pages to update) without a redeploy, so that publishing is self-serve.

### View tracking

1. As a site owner, I want each post's unique-visitor count tracked, so that I know what resonates.
2. As a site owner, I want a visitor identified by an anonymous UUID cookie, so that counting needs no accounts or PII.
3. As a site owner, I want a visitor to count at most once per post, so that refreshes don't inflate numbers.
4. As a site owner, I want views stored in a separate table and counted by query, so that reads never write to the post record and cached pages stay cacheable.
5. As a reader, I want view tracking to be invisible and non-blocking, so that it never slows the page.

### Future-facing (data captured now, features later)

1. As a site owner, I want referral edges (post → person, person → met-via) accumulating from day one, so that a referral graph visualization can be built later without backfilling.
2. As a site owner, I want a reserved slot in the right rail, so that ads or widgets can be added later without redesign.

## Implementation Decisions

- **Architecture:** one Next.js 15 (App Router) application with Payload CMS 3 embedded natively — admin at `/admin`, public site in the same app. No separate backend.
- **Database:** Postgres via Payload's Postgres adapter; hosted Postgres (Neon or similar) with the app deployed to Vercel. Media uploads stored in Vercel Blob (serverless filesystems are ephemeral).
- **Rendering:** public pages are statically generated with incremental revalidation. Publishing/updating a post triggers revalidation of the post page and its full ancestor chain (city, country, year, home, author page).
- **Collections:**
  - **Users** (auth-enabled): name, slug, avatar, bio, role (`admin` | `author`).
  - **Posts**: title, slug, rich text body, excerpt, cover image, gallery, publish date (its year is the URL's `<year>` segment), required relationship → City, optional relationship → Person (referred by), required relationship → User (author, defaults to current user), draft/published status.
  - **Cities**: name, slug, intro blurb, cover image, required relationship → Country.
  - **Countries**: name, slug, intro blurb, cover image.
  - **People**: name, slug, optional photo, note, optional `metVia` relationship → Person or Post (polymorphic).
  - **PostViews**: hidden from the admin UI; rows of (post, visitor UUID, first-seen timestamp) with a unique constraint on (post, visitor UUID).
- **Access control:** authors may create posts and update/delete only their own; admins have full access everywhere. Authors may create Countries/Cities/People (to avoid blocking the writing flow) but only admins may update/delete them. Only published posts are publicly readable; drafts visible to their author and admins.
- **URL contract:** `/` home; `/<year>`; `/<year>/<country>`; `/<year>/<country>/<city>`; `/<year>/<country>/<city>/<slug>`; `/authors/<slug>`. Country and city segments use the slugs from their collections; year comes from the post's publish date. A post's canonical URL is derived, never stored.
- **View tracking contract:** a small client-side effect on post pages sends one POST to a views API route with the post id. The handler reads or sets a 1-year anonymous UUID cookie and upserts into PostViews; the unique constraint makes repeat views idempotent. View count shown on the post page is an aggregate query cached with the page's revalidation window (approximate counts are acceptable).
- **Theme:** warm paper (soft cream) background, deep brown text, dusty pink for interactive/highlight accents, botanical green for structural accents (tags, breadcrumbs, rules). Display font Fraunces; body/UI font a humanist sans (Albert Sans or Cabinet Grotesk), both self-hosted via `next/font`. No box-shadow cards: separation via whitespace, hairline brown rules, background-tint blocks, and type hierarchy.
- **Layout:** article column ~65ch with a sticky right rail (aside) on desktop holding author card, suggested-by card, view count, related-in-city links, and a reserved future-ad slot; rail stacks below content on mobile.

## Testing Decisions

- **Single seam: the app's HTTP boundary.** Integration tests issue real requests to the running app's routes — home, year/country/city aggregation pages, post pages, author pages, and the views API — against a real local Postgres. Tests assert on externally observable behavior (response status, rendered content, database effects of the views endpoint), never on implementation details like component internals or Payload hook call order.
- **Seeding through Payload's Local API**, not raw SQL, so tests exercise the same validation and hooks as production writes.
- **Access control** tested through the same Local API with different user contexts: author A cannot update author B's post; authors cannot delete a Country; unpublished posts are absent from public routes.
- **Views idempotency** tested at the HTTP seam: two POSTs with the same visitor cookie yield one row; distinct cookies yield distinct rows; the endpoint never blocks or breaks page rendering.
- **Prior art:** none — greenfield repo. This suite establishes the pattern; future features should test at this same seam rather than adding new ones.pa

## Out of Scope

- Referral graph **visualization** (the data model captures edges; no graph UI in v1).
- Ads (the rail reserves the slot only).
- Comments, search, RSS feeds, newsletters, i18n/localized content.
- Editor role or any permissions beyond admin/author.
- Analytics beyond per-post unique view counts (no dashboards, no time-series).
- Migration tooling from any existing blog (there is none).

## Further Notes

- The year segment is derived from **publish date**, not creation date — backdating a post moves it in the hierarchy, which is the intended behavior for writing up past trips.
- Two posts may share a slug if they live under different city/year paths; slug uniqueness is only required within a (year, country, city) scope. Simplest safe implementation is global slug uniqueness — acceptable for v1 if scoped uniqueness is fiddly.
- Font licensing: pa and Albert Sans are open (Google Fonts / OFL). Cabinet Grotesk is free via Fontshare with its own license — verify before shipping; Albert Sans is the safe default.
- The design conversation for this PRD is recorded in the brainstorming session of 2026-07-10; palette and type choices are directional and may be tuned during implementation without a PRD change.

