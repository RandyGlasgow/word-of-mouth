import type { Payload } from 'payload'
import type { User } from '../../src/payload-types'

import { beforeAll, beforeEach, describe, expect, it } from 'vitest'

import { getTestPayload, lexicalBody, resetDb, seedPlace, seedUser } from '../helpers'

// Full Maps URLs only — the integration suite never hits the network, so
// short-link resolution is covered by the mocked-fetch unit test instead.
const PIN_URL =
  'https://www.google.com/maps/place/Time+Out+Market/@38.7067,-9.1459,17z/data=!3d38.7069!4d-9.1461'

describe('location hook (Local API)', () => {
  let payload: Payload
  let author: User
  let cityId: number

  beforeAll(async () => {
    payload = await getTestPayload()
  })

  beforeEach(async () => {
    await resetDb(payload)
    ;({ user: author } = await seedUser(payload, { email: 'loc@example.com', role: 'author' }))
    const { city } = await seedPlace(payload, { country: 'Portugal', city: 'Lisbon' })
    cityId = city.id
  })

  const createPost = (location: Record<string, unknown>) =>
    payload.create({
      collection: 'posts',
      data: {
        title: 'A place worth finding',
        body: lexicalBody(),
        publishedDate: '2024-05-01T00:00:00.000Z',
        city: cityId,
        author: author.id,
        location,
      },
      overrideAccess: true,
      context: { skipRevalidate: true },
    })

  it('populates lat/lng and placeName from a mapsUrl on a post', async () => {
    const post = await createPost({ mapsUrl: PIN_URL })
    expect(post.location?.lat).toBeCloseTo(38.7069)
    expect(post.location?.lng).toBeCloseTo(-9.1461)
    expect(post.location?.placeName).toBe('Time Out Market')
  })

  it('populates lat/lng from a mapsUrl on a city', async () => {
    const city = await payload.update({
      collection: 'cities',
      id: cityId,
      data: { location: { mapsUrl: 'https://www.google.com/maps/@48.8584,2.2945,15z' } },
      overrideAccess: true,
      context: { skipRevalidate: true },
    })
    expect(city.location?.lat).toBeCloseTo(48.8584)
    expect(city.location?.lng).toBeCloseTo(2.2945)
  })

  it('does not overwrite a hand-authored placeName', async () => {
    const post = await createPost({ mapsUrl: PIN_URL, placeName: 'My favourite spot' })
    expect(post.location?.placeName).toBe('My favourite spot')
    expect(post.location?.lat).toBeCloseTo(38.7069)
  })

  it('keeps hand-edited coordinates across an unrelated update (URL unchanged)', async () => {
    const post = await createPost({ mapsUrl: PIN_URL })

    // Author nudges the pin by hand; mapsUrl stays the same.
    const edited = await payload.update({
      collection: 'posts',
      id: post.id,
      data: { location: { mapsUrl: PIN_URL, lat: 12.34, lng: 56.78 } },
      overrideAccess: true,
      context: { skipRevalidate: true },
    })
    expect(edited.location?.lat).toBeCloseTo(12.34)
    expect(edited.location?.lng).toBeCloseTo(56.78)

    // An unrelated edit must not re-derive coordinates from the URL.
    const retitled = await payload.update({
      collection: 'posts',
      id: post.id,
      data: { title: 'Renamed' },
      overrideAccess: true,
      context: { skipRevalidate: true },
    })
    expect(retitled.location?.lat).toBeCloseTo(12.34)
    expect(retitled.location?.lng).toBeCloseTo(56.78)
  })

  it('re-derives coordinates when the mapsUrl changes', async () => {
    const post = await createPost({ mapsUrl: PIN_URL })
    const moved = await payload.update({
      collection: 'posts',
      id: post.id,
      data: { location: { mapsUrl: 'https://www.google.com/maps/@48.8584,2.2945,15z' } },
      overrideAccess: true,
      context: { skipRevalidate: true },
    })
    expect(moved.location?.lat).toBeCloseTo(48.8584)
    expect(moved.location?.lng).toBeCloseTo(2.2945)
  })

  it('rejects an unparseable URL with a validation error', async () => {
    // Payload's top-level message is generic ("field is invalid"); the
    // author-facing guidance lives in the field-scoped errors array.
    await expect(createPost({ mapsUrl: 'https://example.com/not-a-map' })).rejects.toMatchObject({
      data: {
        errors: [
          {
            path: 'location.mapsUrl',
            message: expect.stringMatching(/paste the full URL/i),
          },
        ],
      },
    })
  })
})
