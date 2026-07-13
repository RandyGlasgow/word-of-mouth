import type { City, Region } from '@/payload-types'

/** A region as far as labeling cares — only the two fields the label reads. */
export type LabelRegion = Pick<Region, 'name' | 'code'>

/** A city as far as labeling cares: its name plus an optional region, which may
 *  be a bare id when the query depth didn't reach it. */
export type LabelCity = Pick<City, 'name'> & { region?: (number | null) | LabelRegion }

/**
 * Render a city with its region for display: "Sacramento, CA" when the city has
 * a populated region (region.code preferred, region.name as fallback), or just
 * "Tokyo" when it has no region — or when the region relationship wasn't
 * populated (a bare id), since there is nothing to show.
 */
export const cityLabel = (city: LabelCity): string => {
  const region = city.region
  if (region && typeof region === 'object') {
    const suffix = region.code || region.name
    if (suffix) return `${city.name}, ${suffix}`
  }
  return city.name
}
