import { describe, expect, it } from 'vitest'

import { encounterCaption } from '../../src/lib/encounter'

const place = (over = {}) => ({
  id: 1,
  name: 'Torch Club',
  city: { id: 1, name: 'Denver', country: 1 },
  ...over,
})

describe('encounterCaption', () => {
  it('builds "Met at <place>, <city> · <month year>" from metAt and metOn', () => {
    expect(
      encounterCaption({ metAt: place() as never, metOn: '2024-07-10T00:00:00.000Z' }).met,
    ).toBe('Met at Torch Club, Denver · Jul 2024')
  })

  it('includes the region in the city label when the metAt city has one', () => {
    const withRegion = place({
      name: 'Shady Lady',
      city: { id: 1, name: 'Sacramento', region: { id: 1, name: 'California', code: 'CA', country: 1 } },
    })
    expect(encounterCaption({ metAt: withRegion as never, metOn: null }).met).toBe(
      'Met at Shady Lady, Sacramento, CA',
    )
  })

  it('omits the date when metOn is absent', () => {
    expect(encounterCaption({ metAt: place() as never, metOn: null }).met).toBe(
      'Met at Torch Club, Denver',
    )
  })

  it('returns met=null when metAt is absent or unpopulated', () => {
    expect(encounterCaption({ metOn: '2024-07-10T00:00:00.000Z' }).met).toBeNull()
    expect(encounterCaption({ metAt: 7, metOn: null }).met).toBeNull()
  })

  it('builds "introduced by <name>" from metThrough', () => {
    expect(
      encounterCaption({ metThrough: { id: 2, name: 'Sarah' } as never, metOn: null }).intro,
    ).toBe('introduced by Sarah')
  })

  it('returns intro=null when metThrough is absent or unpopulated', () => {
    expect(encounterCaption({ metOn: null }).intro).toBeNull()
    expect(encounterCaption({ metThrough: 5, metOn: null }).intro).toBeNull()
  })
})
