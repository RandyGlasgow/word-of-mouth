import { describe, expect, it } from 'vitest'

import { activeFragment, scrollProgress } from '../../src/lib/heroTagline'

describe('activeFragment', () => {
  const count = 3

  it('maps progress 0 to index 0', () => {
    expect(activeFragment(0, count)).toBe(0)
  })

  it('keeps 0.33 in the first band (index 0)', () => {
    expect(activeFragment(0.33, count)).toBe(0)
  })

  it('lands exactly 1/3 in the second band (index 1)', () => {
    expect(activeFragment(1 / 3, count)).toBe(1)
  })

  it('maps 0.5 to index 1', () => {
    expect(activeFragment(0.5, count)).toBe(1)
  })

  it('lands exactly 2/3 in the third band (index 2)', () => {
    expect(activeFragment(2 / 3, count)).toBe(2)
  })

  it('keeps 0.99 in the third band (index 2)', () => {
    expect(activeFragment(0.99, count)).toBe(2)
  })

  it('maps progress 1.0 to the last index (2)', () => {
    expect(activeFragment(1.0, count)).toBe(2)
  })

  it('clamps negative progress to 0', () => {
    expect(activeFragment(-0.5, count)).toBe(0)
  })

  it('clamps progress above 1 to the last index', () => {
    expect(activeFragment(1.5, count)).toBe(2)
  })
})

describe('scrollProgress', () => {
  it('returns 0 when the hero top is at the viewport top', () => {
    expect(scrollProgress(0, 800, 1600)).toBe(0)
  })

  it('returns 1 when the hero is fully scrolled through', () => {
    expect(scrollProgress(-800, 800, 1600)).toBe(1)
  })

  it('returns 0.5 at the midpoint', () => {
    expect(scrollProgress(-400, 800, 1600)).toBe(0.5)
  })

  it('uses the heroHeight guard when hero is not taller than the viewport', () => {
    // denom = heroHeight = 600; progress = 300 / 600 = 0.5
    expect(scrollProgress(-300, 800, 600)).toBe(0.5)
  })

  it('clamps below 0', () => {
    expect(scrollProgress(100, 800, 1600)).toBe(0)
  })

  it('clamps above 1', () => {
    expect(scrollProgress(-2000, 800, 1600)).toBe(1)
  })
})
