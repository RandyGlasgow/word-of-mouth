import type { Payload } from 'payload'

import { getPayload } from 'payload'

import config from '../../src/payload.config'

export const serverUrl = process.env.TEST_SERVER_URL || 'http://127.0.0.1:3210'

let cached: Payload | undefined

/** Payload Local API bound to the test database — use for seeding and assertions. */
export const getTestPayload = async (): Promise<Payload> => {
  if (!cached) {
    cached = await getPayload({ config })
  }
  return cached
}

/** Wipe all content collections. Call in beforeAll/beforeEach for isolation. */
export const resetDb = async (payload: Payload): Promise<void> => {
  // Order matters: children before the collections they reference.
  for (const slug of ['post-views', 'posts', 'people', 'places', 'cities', 'countries', 'media', 'users'] as const) {
    await payload.delete({ collection: slug, where: {}, overrideAccess: true })
  }
}

type SeedUserArgs = {
  email: string
  name?: string
  role?: 'admin' | 'author'
}

/** Create a user and return it along with a logged-in auth token for REST calls. */
export const seedUser = async (payload: Payload, { email, name, role = 'author' }: SeedUserArgs) => {
  const password = 'test-password-123'
  const user = await payload.create({
    collection: 'users',
    data: { email, password, name: name ?? email.split('@')[0], role },
    overrideAccess: true,
  })
  const { token } = await payload.login({
    collection: 'users',
    data: { email, password },
  })
  return { user, token }
}

/** Minimal valid Lexical richText value for seeding a post `body`. */
export const lexicalBody = (text = 'Body text.') => ({
  root: {
    type: 'root',
    children: [
      {
        type: 'paragraph',
        version: 1,
        children: [{ type: 'text', version: 1, text, detail: 0, format: 0, mode: 'normal', style: '' }],
        direction: 'ltr' as const,
        format: '' as const,
        indent: 0,
      },
    ],
    direction: 'ltr' as const,
    format: '' as const,
    indent: 0,
    version: 1,
  },
})

/**
 * Seed a country + a city inside it + a Place in that city, returning all three.
 * A Post now attaches to a Place (not a City), so `place` is what most post
 * fixtures wire up. Bypasses access control.
 */
export const seedPlace = async (
  payload: Payload,
  { country = 'Portugal', city = 'Lisbon', place }: { country?: string; city?: string; place?: string } = {},
) => {
  // Default the Place name off the city so two distinct cities don't collide on
  // the auto-generated (unique) Place slug.
  const placeName = place ?? `${city} spot`
  const countryDoc = await payload.create({
    collection: 'countries',
    data: { name: country },
    overrideAccess: true,
    context: { skipRevalidate: true },
  })
  const cityDoc = await payload.create({
    collection: 'cities',
    data: { name: city, country: countryDoc.id },
    overrideAccess: true,
    context: { skipRevalidate: true },
  })
  const placeDoc = await payload.create({
    collection: 'places',
    data: { name: placeName, city: cityDoc.id },
    overrideAccess: true,
    context: { skipRevalidate: true },
  })
  return { country: countryDoc, city: cityDoc, place: placeDoc }
}
