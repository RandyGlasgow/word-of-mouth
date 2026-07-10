# Scroll-cycling hero tagline

## Goal

Make the homepage hero tagline feel alive on scroll. As the reader scrolls
through the hero, the "source" of a tip cross-fades through three fragments —
turning a static sentence into a small piece of scroll-driven storytelling —
without changing the hero's height.

## Behavior

The tagline is presented as three lines:

```
Every trip leaves a paper trail of tips —
   <swap slot>                                  ← cross-fades between fragments
This is a journal that keeps that trail visible:
not just where to go, but who sent you there.
```

The first and last blocks hold steady. The middle "swap slot" cross-fades
through three source fragments as scroll progresses:

1. `a bartender's aside`
2. `a friend's must-see list`
3. `a stranger's scribbled napkin map`

The effect is bidirectional — scrolling back up cycles the fragments in
reverse. No extra hero height is added; the existing tall vertical
"Word of Mouth" title supplies the scroll travel while the tagline is pinned
(`position: sticky; top: 2rem`).

## Driving mechanism

A client component tracks scroll progress *through the hero*:

```
progress = clamp(-heroRect.top / (heroHeight - viewportHeight), 0, 1)
```

- `heroRect` is `getBoundingClientRect()` of the `.hero` element.
- `heroHeight` is the hero's `offsetHeight`.
- Guard: if `heroHeight - viewportHeight <= 0` (hero not taller than the
  viewport), fall back to `clamp(-heroRect.top / heroHeight, 0, 1)` so the
  effect still degrades sensibly instead of dividing by zero.

Progress maps to an active fragment index across `count` fragments:

- `[0, 1/3)` → 0
- `[1/3, 2/3)` → 1
- `[2/3, 1]` → 2

The scroll handler is throttled with `requestAnimationFrame` (a single pending
frame; coalesce multiple scroll events into one measurement). A `resize`
listener re-measures. Listeners are attached with `{ passive: true }` and
removed on unmount.

## Cross-fade

The three fragments are absolutely stacked inside the swap slot:

- A visually-hidden **sizer** span containing the longest fragment sits in
  normal flow and sets the slot's height, so the slot reserves the right space
  (including any wrapping on narrow screens) and nothing reflows as fragments
  change.
- Each fragment span is `position: absolute`, filling the slot.
- The active fragment has `opacity: 1`; the rest `opacity: 0`.
- `transition: opacity ~0.45s ease` on the fragment spans.

Scroll only flips the active index; CSS animates the fade. There is no
per-frame opacity scrubbing.

## Component boundaries

- **New client component `HeroTagline`** (`'use client'`) replaces the
  `<p className="hero__tagline">…</p>` in
  `src/app/(site)/page.tsx`. It renders the tagline markup and owns all
  scroll/measurement logic. It locates its progress element via
  `rootRef.current.closest('.hero')`, so `page.tsx`'s hero structure is
  otherwise unchanged.
- **Two pure functions**, extracted so they can be unit-tested without a DOM:
  - `scrollProgress(rectTop, viewportHeight, heroHeight)` → number in `[0, 1]`.
  - `activeFragment(progress, count)` → integer index in `[0, count)`.

## Accessibility & fallback

- The component **server-renders the original single sentence** (the three
  fragments as a comma-separated list, exactly as today). This is what no-JS
  users and crawlers see.
- After mount, it enhances to the swap presentation **only if**
  `prefers-reduced-motion` is not set (`matchMedia('(prefers-reduced-motion:
  reduce)')`).
- Enhancement is gated behind an `useEffect`-set flag so the initial client
  render matches the server render (no hydration mismatch); the swap UI appears
  only after mount.
- Reduced-motion users keep the static full sentence permanently.

## Data

The fragments and the framing text live in the `HeroTagline` component. The
fallback sentence must read identically to the current copy:

> Every trip leaves a paper trail of tips — a bartender's aside, a friend's
> must-see list, a stranger's scribbled napkin map. This is a journal that
> keeps that trail visible: not just where to go, but who sent you there.

## Testing

- Unit tests for `activeFragment`: boundaries (0, 1/3, 2/3, 1), clamping below
  0 and above 1, and that the last band includes exactly 1.0.
- Unit tests for `scrollProgress`: hero taller than viewport, the
  `heroHeight <= viewportHeight` guard branch, and clamping at both ends.
- The scroll wiring, `closest('.hero')` lookup, and CSS transition are verified
  by manual/visual check in the running app (not unit-tested).

## Out of scope

- Adding hero height or a pinned "stage" section.
- Any transition style other than cross-fade in place.
- Changing the tagline copy.
