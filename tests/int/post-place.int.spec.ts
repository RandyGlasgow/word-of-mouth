import type { Payload } from 'payload'
import type { User } from '../../src/payload-types'

import { beforeAll, beforeEach, describe, expect, it } from 'vitest'

import { getTestPayload, lexicalBody, resetDb, seedPlace, seedUser } from '../helpers'

// A Post's URL is /[year]/[country]/[city]/[slug], so its Place must have a
// city. The Posts.place field enforces this at the write boundary; incidental
// (cityless) Places are only valid as Person.metAt encounter spots.
describe('post → place city invariant', () => {
  let payload: Payload
  let author: User
  let cityId: number

  beforeAll(async () => {
    payload = await getTestPayload()
  })

  beforeEach(async () => {
    await resetDb(payload)
    ;({ user: author } = await seedUser(payload, { email: 'pp@example.com', role: 'author' }))
    const { city } = await seedPlace(payload, { country: 'Portugal', city: 'Lisbon' })
    cityId = city.id
  })

  const createPost = (placeId: number) =>
    payload.create({
      collection: 'posts',
      data: {
        title: 'A place worth finding',
        body: lexicalBody(),
        publishedDate: '2024-05-01T00:00:00.000Z',
        place: placeId,
        author: author.id,
        _status: 'published',
      },
      overrideAccess: true,
      context: { skipRevalidate: true },
    })

  it('rejects a post whose place has no city', async () => {
    const cityless = await payload.create({
      collection: 'places',
      data: { name: 'Maria’s rooftop' },
      overrideAccess: true,
      context: { skipRevalidate: true },
    })

    await expect(createPost(cityless.id)).rejects.toMatchObject({
      data: {
        errors: [
          {
            path: 'place',
            message: expect.stringMatching(/must belong to a city/i),
          },
        ],
      },
    })
  })

  it('accepts a post whose place has a city', async () => {
    const place = await payload.create({
      collection: 'places',
      data: { name: 'Tasca do Chico', city: cityId },
      overrideAccess: true,
      context: { skipRevalidate: true },
    })

    const post = await createPost(place.id)
    expect(post.id).toBeDefined()
    // create returns the doc at default depth, so place is populated.
    const placeId = typeof post.place === 'object' ? post.place.id : post.place
    expect(placeId).toBe(place.id)
  })
})
