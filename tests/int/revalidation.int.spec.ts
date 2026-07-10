import type { Payload } from 'payload'
import type { User } from '../../src/payload-types'

import { revalidatePath } from 'next/cache'
import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'

import { getTestPayload, lexicalBody, resetDb, seedPlace, seedUser } from '../helpers'

vi.mock('next/cache', () => ({
  revalidatePath: vi.fn(),
  revalidateTag: vi.fn(),
}))

const calledPaths = () => vi.mocked(revalidatePath).mock.calls.map(([p]) => p)

describe('revalidation hooks', () => {
  let payload: Payload
  let author: User
  let countryId: number
  let cityId: number

  beforeAll(async () => {
    payload = await getTestPayload()
  })

  beforeEach(async () => {
    await resetDb(payload)
    ;({ user: author } = await seedUser(payload, { email: 'rev@example.com', name: 'Rev Writer', role: 'author' }))
    const { country, city } = await seedPlace(payload, { country: 'Portugal', city: 'Lisbon' })
    countryId = country.id
    cityId = city.id
    vi.mocked(revalidatePath).mockClear()
  })

  it('publishing a post revalidates the post page and its full ancestor chain', async () => {
    await payload.create({
      collection: 'posts',
      data: {
        title: 'A night in Alfama',
        slug: 'a-night-in-alfama',
        body: lexicalBody(),
        publishedDate: '2023-06-01T00:00:00.000Z',
        city: cityId,
        author: author.id,
        _status: 'published',
      },
      overrideAccess: true,
    })

    const author2 = await payload.findByID({ collection: 'users', id: author.id, overrideAccess: true })
    const paths = calledPaths()

    expect(paths).toEqual(
      expect.arrayContaining([
        '/',
        '/2023',
        '/2023/portugal',
        '/2023/portugal/lisbon',
        '/2023/portugal/lisbon/a-night-in-alfama',
        `/authors/${author2.slug}`,
      ]),
    )
  })

  it('skips revalidation when context.skipRevalidate is set', async () => {
    await payload.create({
      collection: 'posts',
      data: {
        title: 'Quiet seed',
        body: lexicalBody(),
        publishedDate: '2023-06-01T00:00:00.000Z',
        city: cityId,
        author: author.id,
        _status: 'published',
      },
      overrideAccess: true,
      context: { skipRevalidate: true },
    })

    expect(calledPaths()).toHaveLength(0)
  })

  it('deleting a post revalidates its ancestor chain', async () => {
    const post = await payload.create({
      collection: 'posts',
      data: {
        title: 'To be removed',
        slug: 'to-be-removed',
        body: lexicalBody(),
        publishedDate: '2024-01-01T00:00:00.000Z',
        city: cityId,
        author: author.id,
        _status: 'published',
      },
      overrideAccess: true,
      context: { skipRevalidate: true },
    })
    vi.mocked(revalidatePath).mockClear()

    await payload.delete({ collection: 'posts', id: post.id, overrideAccess: true })

    expect(calledPaths()).toEqual(
      expect.arrayContaining(['/', '/2024', '/2024/portugal', '/2024/portugal/lisbon']),
    )
  })

  it('editing a city intro revalidates the city pages that carry published posts', async () => {
    await payload.create({
      collection: 'posts',
      data: {
        title: 'Lisbon story',
        body: lexicalBody(),
        publishedDate: '2022-09-01T00:00:00.000Z',
        city: cityId,
        author: author.id,
        _status: 'published',
      },
      overrideAccess: true,
      context: { skipRevalidate: true },
    })
    vi.mocked(revalidatePath).mockClear()

    await payload.update({
      collection: 'cities',
      id: cityId,
      data: { intro: 'A hilly city of light.' },
      overrideAccess: true,
    })

    const paths = calledPaths()
    expect(paths).toContain('/')
    expect(paths).toContain('/2022/portugal/lisbon')
  })

  it('editing a country intro revalidates the country pages that carry published posts', async () => {
    await payload.create({
      collection: 'posts',
      data: {
        title: 'Portugal story',
        body: lexicalBody(),
        publishedDate: '2021-03-01T00:00:00.000Z',
        city: cityId,
        author: author.id,
        _status: 'published',
      },
      overrideAccess: true,
      context: { skipRevalidate: true },
    })
    vi.mocked(revalidatePath).mockClear()

    await payload.update({
      collection: 'countries',
      id: countryId,
      data: { intro: 'Westernmost country of mainland Europe.' },
      overrideAccess: true,
    })

    const paths = calledPaths()
    expect(paths).toContain('/')
    expect(paths).toContain('/2021/portugal')
  })
})
