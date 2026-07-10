'use client'

import React, { useEffect, useRef, useState } from 'react'

import { activeFragment, scrollProgress } from '@/lib/heroTagline'

const FRAGMENTS = [
  "a bartender's aside",
  "a friend's must-see list",
  "a stranger's scribbled napkin map",
] as const

// The longest fragment sizes the swap slot so nothing reflows as fragments change.
const LONGEST_FRAGMENT = "a stranger's scribbled napkin map"

/** Homepage hero tagline. Server-renders the original single sentence (the
 *  no-JS / crawler / reduced-motion view). After mount, if the user has not
 *  requested reduced motion, it enhances to a three-line layout whose middle
 *  "swap slot" cross-fades through the three source fragments as the reader
 *  scrolls through the `.hero`. */
export function HeroTagline() {
  const rootRef = useRef<HTMLParagraphElement>(null)
  const [enhanced, setEnhanced] = useState(false)
  const [active, setActive] = useState(0)

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
        must-see list, a stranger&apos;s scribbled napkin map. This is a journal that keeps that trail
        visible: not just where to go, but who sent you there.
      </p>
    )
  }

  return (
    <p className="hero__tagline" ref={rootRef}>
      Every trip leaves a paper trail of tips —{' '}
      <span className="hero__swap">
        <span className="hero__swap-sizer" aria-hidden="true">
          {LONGEST_FRAGMENT}
        </span>
        {FRAGMENTS.map((fragment, i) => (
          <span
            key={fragment}
            className="hero__fragment"
            style={{ opacity: i === active ? 1 : 0 }}
            aria-hidden={i === active ? undefined : true}
          >
            {fragment}
          </span>
        ))}
      </span>
      . This is a journal that keeps that trail visible: not just where to go, but who sent you
      there.
    </p>
  )
}
