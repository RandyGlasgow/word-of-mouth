'use client'

import React, { useEffect, useLayoutEffect, useRef, useState } from 'react'

import { activeFragment, scrollProgress } from '@/lib/heroTagline'

const FRAGMENTS = [
  "a bartender's aside",
  "a friend's must-see list",
  "a stranger's scribbled napkin map",
] as const

/** Homepage hero tagline. Server-renders the original single sentence (the
 *  no-JS / crawler / reduced-motion view). After mount, if the user has not
 *  requested reduced motion, it enhances to an inline "swap slot" whose source
 *  fragment cross-fades — and whose width animates to hug the active fragment,
 *  so the following clause reflows smoothly with no dead gap — as the reader
 *  scrolls through the `.hero`. */
export function HeroTagline() {
  const rootRef = useRef<HTMLParagraphElement>(null)
  const fragmentRefs = useRef<(HTMLSpanElement | null)[]>([])
  const [enhanced, setEnhanced] = useState(false)
  const [active, setActive] = useState(0)
  // Measured width (px) of each fragment; drives the animated slot width.
  const [widths, setWidths] = useState<number[]>([])

  // Gate enhancement behind an effect so the initial client render matches the
  // server render (no hydration mismatch). Reduced-motion users keep the static
  // sentence permanently.
  useEffect(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return
    // Gating enhancement on mount is the intended no-hydration-mismatch pattern;
    // the one-time flip is deliberate, not a cascading-render bug.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setEnhanced(true)
  }, [])

  // Measure each fragment's rendered width. Runs before paint (layout effect) so
  // the first enhanced frame already has correct widths, and re-runs when fonts
  // finish loading or the viewport resizes (font-size is viewport-clamped).
  useLayoutEffect(() => {
    if (!enhanced) return

    const measure = () => {
      const next = fragmentRefs.current.map((el) => el?.offsetWidth ?? 0)
      setWidths((prev) =>
        prev.length === next.length && prev.every((w, i) => w === next[i]) ? prev : next,
      )
    }

    measure()

    let cancelled = false
    // Fonts can land after first paint; re-measure once they're ready.
    document.fonts?.ready.then(() => {
      if (!cancelled) measure()
    })
    window.addEventListener('resize', measure, { passive: true })

    return () => {
      cancelled = true
      window.removeEventListener('resize', measure)
    }
  }, [enhanced])

  useEffect(() => {
    if (!enhanced) return

    let rafPending = false

    const measure = () => {
      rafPending = false
      const hero = rootRef.current?.closest('.hero') as HTMLElement | null
      if (!hero) return
      const top = hero.getBoundingClientRect().top
      const progress = scrollProgress(top, window.innerHeight, hero.offsetHeight)
      const next = activeFragment(progress, FRAGMENTS.length)
      setActive((prev) => (prev === next ? prev : next))
    }

    const onScroll = () => {
      if (rafPending) return
      rafPending = true
      requestAnimationFrame(measure)
    }

    window.addEventListener('scroll', onScroll, { passive: true })
    window.addEventListener('resize', onScroll, { passive: true })

    // One measurement immediately on enhance.
    measure()

    return () => {
      window.removeEventListener('scroll', onScroll)
      window.removeEventListener('resize', onScroll)
    }
  }, [enhanced])

  if (!enhanced) {
    return (
      <p className="hero__tagline" ref={rootRef}>
        Every trip leaves a paper trail of tips — a bartender&apos;s aside, a friend&apos;s
        must-see list, a stranger&apos;s scribbled napkin map.
      </p>
    )
  }

  const slotWidth = widths[active]

  return (
    <p className="hero__tagline" ref={rootRef}>
      Every trip leaves a paper trail of tips —{' '}
      <span className="hero__swap" style={slotWidth ? { width: `${slotWidth}px` } : undefined}>
        {FRAGMENTS.map((fragment, i) => (
          <span
            key={fragment}
            ref={(el) => {
              fragmentRefs.current[i] = el
            }}
            className="hero__fragment"
            style={{ opacity: i === active ? 1 : 0 }}
            aria-hidden={i === active ? undefined : true}
          >
            {fragment}
          </span>
        ))}
      </span>
    </p>
  )
}
