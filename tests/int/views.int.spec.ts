import type { Payload } from 'payload'

import { beforeAll, beforeEach, describe, expect, it } from 'vitest'

import { getTestPayload, resetDb, seedUser, serverUrl } from '../helpers'

const richText = {
  root: {
    type: 'root',
    children: [
      {
        type: 'paragraph',
        version: 1,
        children: [{ type: 'text', text: 'hi', version: 1 }],
      },
    ],
    direction: null as null,
    format: '' as const,
    indent: 0,
    version: 1,
  },
}

/** Seed a published post through the Local API and return its numeric id. */
const seedPost = async (payload: Payload): Promise<number> => {
  const { user } = await seedUser(payload, { email: 'author@example.com' })
  const country = await payload.create({
    collection: 'countries',
    data: { name: 'Portugal' },
    overrideAccess: true,
  })
  const city = await payload.create({
    collection: 'cities',
    data: { name: 'Lisbon', country: country.id },
    overrideAccess: true,
  })
  const place = await payload.create({
    collection: 'places',
    data: { name: 'A night out spot', city: city.id },
    overrideAccess: true,
  })
  const post = await payload.create({
    collection: 'posts',
    data: {
      title: 'A night out in Lisbon',
      body: richText,
      publishedDate: '2026-05-01T00:00:00.000Z',
      place: place.id,
      author: user.id,
      _status: 'published',
    },
    overrideAccess: true,
  })
  return post.id as number
}

const countRows = async (payload: Payload, postId: number): Promise<number> => {
  const { totalDocs } = await payload.count({
    collection: 'post-views',
    where: { post: { equals: postId } },
    overrideAccess: true,
  })
  return totalDocs
}

/** Extract the value of a Set-Cookie'd cookie from a response, if present. */
const setCookieValue = (res: Response, name: string): string | undefined => {
  const header = res.headers.get('set-cookie')
  if (!header) return undefined
  const match = header.match(new RegExp(`${name}=([^;]+)`))
  return match?.[1]
}

describe('views API (HTTP seam)', () => {
  let payload: Payload
  let postId: number

  beforeAll(async () => {
    payload = await getTestPayload()
  })

  beforeEach(async () => {
    await resetDb(payload)
    postId = await seedPost(payload)
  })

  it('sets the wom_uid cookie and creates exactly one row on a first view', async () => {
    const res = await fetch(`${serverUrl}/api/views/${postId}`, { method: 'POST' })
    expect(res.status).toBe(204)

    const setCookie = res.headers.get('set-cookie') ?? ''
    expect(setCookie).toMatch(/wom_uid=/)
    expect(setCookie.toLowerCase()).toContain('httponly')
    expect(setCookie.toLowerCase()).toContain('samesite=lax')
    expect(setCookie.toLowerCase()).toContain('path=/')
    // ~1 year expiry.
    expect(setCookie.toLowerCase()).toMatch(/max-age=3153\d{4}/)

    expect(await countRows(payload, postId)).toBe(1)
  })

  it('is idempotent: two POSTs with the same cookie yield one row', async () => {
    const first = await fetch(`${serverUrl}/api/views/${postId}`, { method: 'POST' })
    const uid = setCookieValue(first, 'wom_uid')
    expect(uid).toBeTruthy()

    const second = await fetch(`${serverUrl}/api/views/${postId}`, {
      method: 'POST',
      headers: { cookie: `wom_uid=${uid}` },
    })
    expect(second.status).toBe(204)
    // A returning visitor already has the cookie — no need to re-set it.
    expect(second.headers.get('set-cookie')).toBeFalsy()

    expect(await countRows(payload, postId)).toBe(1)
  })

  it('counts distinct visitors separately: two cookies yield two rows', async () => {
    await fetch(`${serverUrl}/api/views/${postId}`, {
      method: 'POST',
      headers: { cookie: 'wom_uid=11111111-1111-1111-1111-111111111111' },
    })
    await fetch(`${serverUrl}/api/views/${postId}`, {
      method: 'POST',
      headers: { cookie: 'wom_uid=22222222-2222-2222-2222-222222222222' },
    })
    expect(await countRows(payload, postId)).toBe(2)
  })

  it('returns 404 for a nonexistent post and records no row', async () => {
    const res = await fetch(`${serverUrl}/api/views/999999`, { method: 'POST' })
    expect(res.status).toBe(404)
    expect(await countRows(payload, 999999)).toBe(0)
  })

  it('returns 404 for a non-numeric post id', async () => {
    const res = await fetch(`${serverUrl}/api/views/not-a-number`, { method: 'POST' })
    expect(res.status).toBe(404)
  })

  it('rejects non-POST methods with 405', async () => {
    const res = await fetch(`${serverUrl}/api/views/${postId}`, { method: 'GET' })
    expect(res.status).toBe(405)
  })

  it('denies anonymous REST reads of the post-views collection', async () => {
    // Record a row so the collection is non-empty.
    await fetch(`${serverUrl}/api/views/${postId}`, { method: 'POST' })

    const res = await fetch(`${serverUrl}/api/post-views`)
    if (res.status === 200) {
      // Access returning false yields an empty result set rather than an error.
      const body = await res.json()
      expect(body.docs).toHaveLength(0)
    } else {
      expect([401, 403]).toContain(res.status)
    }
  })
})
