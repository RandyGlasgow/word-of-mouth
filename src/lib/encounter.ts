import type { Person, Place } from '@/payload-types'

import { cityLabel, type LabelCity } from './cityLabel'

/** A person as far as the encounter caption cares: where/when we met them and
 *  who introduced us. Each relationship may be unpopulated (a bare id). */
export type EncounterPerson = Pick<Person, 'metOn'> & {
  metAt?: (number | null) | Place
  metThrough?: (number | null) | Person
}

/** Month + year like "Jul 2024", in UTC to match the rest of the site's dates. */
const monthYear = (iso: string): string =>
  new Date(iso).toLocaleDateString('en-GB', { month: 'short', year: 'numeric', timeZone: 'UTC' })

/**
 * The two facts about how we met a person, ready to render:
 *  - `met`:  "Met at Torch Club, Denver · Jul 2024" (from `metAt` + `metOn`)
 *  - `intro`: "introduced by Sarah" (from `metThrough`)
 * Either can be null when the underlying fact is absent or unpopulated.
 */
export const encounterCaption = (
  person: EncounterPerson,
): { met: string | null; intro: string | null } => {
  let met: string | null = null
  const place = person.metAt
  if (place && typeof place === 'object') {
    const parts = [place.name]
    const city = place.city
    if (city && typeof city === 'object') parts.push(cityLabel(city as LabelCity))
    met = `Met at ${parts.join(', ')}`
    if (person.metOn) met += ` · ${monthYear(person.metOn)}`
  }

  const through = person.metThrough
  const intro = through && typeof through === 'object' ? `introduced by ${through.name}` : null

  return { met, intro }
}
