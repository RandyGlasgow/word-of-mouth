import type { Payload } from 'payload'
import type { User } from '../../src/payload-types'

import { beforeAll, beforeEach, describe, expect, it } from 'vitest'

import { cityLabel } from '../../src/lib/cityLabel'
import { encounterCaption } from '../../src/lib/encounter'
import { getPostByPath, postYear, type PopulatedPost } from '../../src/lib/queries'
import { getTestPayload, lexicalBody, resetDb, seedUser } from '../helpers'

const ctx = { overrideAccess: true as const, context: { skipRevalidate: true } }

// The seeded shape the site reads: a Post rolls up place → city → region /
// country, and a Place → Person → Place referral chain resolves as one
// traversal. depth 3 is enough — city.region sits at the same hop as
// city.country (post → place → city → region), so both populate together.
describe('place → city → region resolution and the encounter chain', () => {
  let payload: Payload
  let author: User

  beforeAll(async () => {
    payload = await getTestPayload()
  })

  beforeEach(async () => {
    await resetDb(payload)
    ;({ user: author } = await seedUser(payload, { email: 'pe@example.com', role: 'author' }))
  })

  const createCity = async (opts: { country: string; city: string; region?: { name: string; code?: string } }) => {
    const country = await payload.create({ collection: 'countries', data: { name: opts.country }, ...ctx })
    const region = opts.region
      ? await payload.create({
          collection: 'regions',
          data: { name: opts.region.name, code: opts.region.code, country: country.id },
          ...ctx,
        })
      : undefined
    const city = await payload.create({
      collection: 'cities',
      data: { name: opts.city, country: country.id, ...(region ? { region: region.id } : {}) },
      ...ctx,
    })
    return { country, region, city }
  }

  const createPost = async (opts: { title: string; cityId: number; date: string; referredBy?: number }) => {
    const place = await payload.create({
      collection: 'places',
      data: { name: `${opts.title} place`, city: opts.cityId },
      ...ctx,
    })
    const post = await payload.create({
      collection: 'posts',
      data: {
        title: opts.title,
        body: lexicalBody(),
        publishedDate: `${opts.date}T00:00:00.000Z`,
        place: place.id,
        author: author.id,
        ...(opts.referredBy ? { referredBy: opts.referredBy } : {}),
        _status: 'published',
      },
      ...ctx,
    })
    return { place, post }
  }

  const findPost = async (id: number): Promise<PopulatedPost> => {
    const doc = await payload.findByID({ collection: 'posts', id, depth: 3, overrideAccess: false })
    return doc as unknown as PopulatedPost
  }

  it('resolves a post whose city has a region into "Sacramento, CA" at depth 3', async () => {
    const { city } = await createCity({
      country: 'USA',
      city: 'Sacramento',
      region: { name: 'California', code: 'CA' },
    })
    const { post } = await createPost({ title: 'Alley bar', cityId: city.id, date: '2026-04-08' })

    const populated = await findPost(post.id)
    // The full roll-up is present: place → city → country and → region.
    expect(populated.place.city.name).toBe('Sacramento')
    expect(populated.place.city.country.name).toBe('USA')
    expect(populated.place.city.region?.code).toBe('CA')
    expect(cityLabel(populated.place.city)).toBe('Sacramento, CA')
  })

  it('resolves a region-less city into a bare "Tokyo"', async () => {
    const { city } = await createCity({ country: 'Japan', city: 'Tokyo' })
    const { post } = await createPost({ title: 'Counter for eight', cityId: city.id, date: '2025-09-21' })

    const populated = await findPost(post.id)
    expect(populated.place.city.region).toBeFalsy()
    expect(cityLabel(populated.place.city)).toBe('Tokyo')
  })

  it('resolves a Place → Person → Place referral chain end-to-end', async () => {
    // Origin: an incidental Place where we met the referrer.
    const { city: originCity } = await createCity({ country: 'Portugal', city: 'Lisbon' })
    const origin = await payload.create({
      collection: 'places',
      data: { name: 'Maria’s rooftop', city: originCity.id },
      ...ctx,
    })
    const tom = await payload.create({
      collection: 'people',
      data: { name: 'Tom', metAt: origin.id, metOn: '2024-07-10T00:00:00.000Z' },
      ...ctx,
    })

    // Next hop: a written-up Place that Tom pointed us to.
    const { city: nextCity } = await createCity({
      country: 'USA',
      city: 'Sacramento',
      region: { name: 'California', code: 'CA' },
    })
    const { post } = await createPost({
      title: 'Shady Lady',
      cityId: nextCity.id,
      date: '2026-04-08',
      referredBy: tom.id,
    })

    const populated = await findPost(post.id)
    // The referral edge and the person's origin encounter both resolve.
    expect(populated.referredBy?.name).toBe('Tom')
    const metAt = populated.referredBy?.metAt
    expect(typeof metAt === 'object' && metAt?.name).toBe('Maria’s rooftop')

    const caption = encounterCaption(populated.referredBy!)
    expect(caption.met).toBe('Met at Maria’s rooftop, Lisbon · Jul 2024')
  })

  it('resolves the region on a metAt place through getPostByPath (depth 4)', async () => {
    // The referrer was met at a Place whose city carries a region. That region
    // is a hop deeper than the post's own city (post → referredBy → metAt →
    // city → region), so only the depth-4 detail query surfaces it — the whole
    // point of the fix. At depth 3 the caption would silently drop the ", CA".
    const { city } = await createCity({
      country: 'USA',
      city: 'Sacramento',
      region: { name: 'California', code: 'CA' },
    })
    const shadyLady = await payload.create({
      collection: 'places',
      data: { name: 'Shady Lady', city: city.id },
      ...ctx,
    })
    const sam = await payload.create({
      collection: 'people',
      data: { name: 'Sam', metAt: shadyLady.id, metOn: '2026-04-08T00:00:00.000Z' },
      ...ctx,
    })
    const { post } = await createPost({
      title: 'The alley bar',
      cityId: city.id,
      date: '2026-04-08',
      referredBy: sam.id,
    })

    // Read the derived path off the post, then resolve it the way the page does.
    const seed = await findPost(post.id)
    const resolved = await getPostByPath(
      postYear(seed),
      seed.place.city.country.slug!,
      seed.place.city.slug!,
      seed.slug!,
    )
    expect(resolved).not.toBeNull()

    const caption = encounterCaption(resolved!.referredBy!)
    expect(caption.met).toBe('Met at Shady Lady, Sacramento, CA · Apr 2026')
  })
})
