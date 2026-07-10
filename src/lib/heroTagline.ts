/** Pure helpers for the scroll-cycling hero tagline. No React or DOM imports so
 *  they can be unit-tested in a plain node environment. */

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max)
}

/** Scroll progress *through the hero*, in [0, 1].
 *
 *  `denom = heroHeight - viewportHeight`; if the hero is not taller than the
 *  viewport (`denom <= 0`) we fall back to `denom = heroHeight` so the effect
 *  degrades sensibly instead of dividing by zero. */
export function scrollProgress(
  rectTop: number,
  viewportHeight: number,
  heroHeight: number,
): number {
  let denom = heroHeight - viewportHeight
  if (denom <= 0) denom = heroHeight
  const progress = -rectTop / denom
  return clamp(progress, 0, 1)
}

/** Maps progress in [0, 1] to an active fragment index in [0, count).
 *  progress = 1.0 lands on the last index; bands are [0, 1/n), [1/n, 2/n), … */
export function activeFragment(progress: number, count: number): number {
  return clamp(Math.floor(progress * count), 0, count - 1)
}
