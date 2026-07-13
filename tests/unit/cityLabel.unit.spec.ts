import { describe, expect, it } from 'vitest'

import { cityLabel } from '../../src/lib/cityLabel'

describe('cityLabel', () => {
  it('uses the region code when present: "Sacramento, CA"', () => {
    expect(cityLabel({ name: 'Sacramento', region: { name: 'California', code: 'CA' } })).toBe(
      'Sacramento, CA',
    )
  })

  it('falls back to the region name when there is no code', () => {
    expect(cityLabel({ name: 'Sacramento', region: { name: 'California' } })).toBe(
      'Sacramento, California',
    )
  })

  it('renders just the city name when there is no region', () => {
    expect(cityLabel({ name: 'Tokyo' })).toBe('Tokyo')
    expect(cityLabel({ name: 'Tokyo', region: null })).toBe('Tokyo')
  })

  it('renders just the city name when the region is unpopulated (a bare id)', () => {
    expect(cityLabel({ name: 'Tokyo', region: 42 })).toBe('Tokyo')
  })
})
