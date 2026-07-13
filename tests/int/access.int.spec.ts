import type { Payload } from 'payload'
import type { User } from '../../src/payload-types'

import { beforeAll, beforeEach, describe, expect, it } from 'vitest'

import { getTestPayload, lexicalBody, resetDb, seedPlace, seedUser } from '../helpers'

// Access-control tests run entirely through the Payload Local API with
// `overrideAccess: false` and explicit `user` contexts — no HTTP needed.
describe('access control', () => {
  let payload: Payload
  let admin: User
  let authorA: User
  let authorB: User
  let placeId: number

  beforeAll(async () => {
    payload = await getTestPayload()
  })

  beforeEach(async () => {
    await resetDb(payload)
    ;({ user: admin } = await seedUser(payload, { email: 'admin@example.com', name: 'Admin', role: 'admin' }))
    ;({ user: authorA } = await seedUser(payload, { email: 'a@example.com', name: 'Ana', role: 'author' }))
    ;({ user: authorB } = await seedUser(payload, { email: 'b@example.com', name: 'Bo', role: 'author' }))
    const { place } = await seedPlace(payload)
    placeId = place.id
  })

  const makePost = async (author: User, status: 'draft' | 'published', title = 'A trip') =>
    payload.create({
      collection: 'posts',
      data: {
        title,
        body: lexicalBody(),
        publishedDate: '2023-06-01T00:00:00.000Z',
        place: placeId,
        author: author.id,
        _status: status,
      },
      overrideAccess: true,
      context: { skipRevalidate: true },
    })

  describe('Posts read', () => {
    it('anonymous sees published posts but not drafts', async () => {
      await makePost(authorA, 'published', 'Published one')
      await makePost(authorA, 'draft', 'Draft one')

      const res = await payload.find({ collection: 'posts', overrideAccess: false })

      expect(res.docs).toHaveLength(1)
      expect(res.docs[0].title).toBe('Published one')
    })

    it('an author can read their own draft', async () => {
      await makePost(authorA, 'draft', 'My draft')

      const res = await payload.find({ collection: 'posts', overrideAccess: false, user: authorA })

      expect(res.docs.map((d) => d.title)).toContain('My draft')
    })

    it('an author cannot read another author draft', async () => {
      await makePost(authorB, 'draft', 'B secret')

      const res = await payload.find({ collection: 'posts', overrideAccess: false, user: authorA })

      expect(res.docs).toHaveLength(0)
    })
  })

  describe('Posts update/delete', () => {
    it('author A cannot update author B post', async () => {
      const post = await makePost(authorB, 'published')

      await expect(
        payload.update({
          collection: 'posts',
          id: post.id,
          data: { title: 'Hijacked' },
          overrideAccess: false,
          user: authorA,
        }),
      ).rejects.toThrow()
    })

    it('author A cannot delete author B post', async () => {
      const post = await makePost(authorB, 'published')

      await expect(
        payload.delete({ collection: 'posts', id: post.id, overrideAccess: false, user: authorA }),
      ).rejects.toThrow()
    })

    it('an author can update their own post', async () => {
      const post = await makePost(authorA, 'published')

      const updated = await payload.update({
        collection: 'posts',
        id: post.id,
        data: { title: 'Revised' },
        overrideAccess: false,
        user: authorA,
        context: { skipRevalidate: true },
      })

      expect(updated.title).toBe('Revised')
    })

    it('an admin can update any post', async () => {
      const post = await makePost(authorA, 'published')

      const updated = await payload.update({
        collection: 'posts',
        id: post.id,
        data: { title: 'Moderated' },
        overrideAccess: false,
        user: admin,
        context: { skipRevalidate: true },
      })

      expect(updated.title).toBe('Moderated')
    })
  })

  describe('Posts create', () => {
    it('an anonymous request cannot create a post', async () => {
      await expect(
        payload.create({
          collection: 'posts',
          data: {
            title: 'Nope',
            body: lexicalBody(),
            publishedDate: '2023-06-01T00:00:00.000Z',
            place: placeId,
            author: authorA.id,
          },
          overrideAccess: false,
        }),
      ).rejects.toThrow()
    })
  })

  describe.each(['countries', 'cities', 'people'] as const)('taxonomy: %s', (collection) => {
    const dataFor = (name: string) => {
      if (collection === 'cities') return { name, country: undefined as unknown as number }
      return { name }
    }

    it('an author can create but not update or delete', async () => {
      // create as author
      const created = await payload.create({
        collection,
        data:
          collection === 'cities'
            ? { name: 'Porto', country: (await seedPlace(payload, { country: 'X', city: 'Y' })).country.id }
            : dataFor('New thing'),
        overrideAccess: false,
        user: authorA,
        context: { skipRevalidate: true },
      })
      expect(created.id).toBeDefined()

      await expect(
        payload.update({
          collection,
          id: created.id,
          data: { name: 'Renamed' },
          overrideAccess: false,
          user: authorA,
          context: { skipRevalidate: true },
        }),
      ).rejects.toThrow()

      await expect(
        payload.delete({ collection, id: created.id, overrideAccess: false, user: authorA }),
      ).rejects.toThrow()
    })

    it('an admin can update and delete', async () => {
      const created = await payload.create({
        collection,
        data:
          collection === 'cities'
            ? { name: 'Sintra', country: (await seedPlace(payload, { country: 'Z', city: 'W' })).country.id }
            : dataFor('Admin thing'),
        overrideAccess: true,
        context: { skipRevalidate: true },
      })

      const updated = await payload.update({
        collection,
        id: created.id,
        data: { name: 'Admin renamed' },
        overrideAccess: false,
        user: admin,
        context: { skipRevalidate: true },
      })
      expect(updated.name).toBe('Admin renamed')

      await expect(
        payload.delete({ collection, id: created.id, overrideAccess: false, user: admin }),
      ).resolves.toBeTruthy()
    })
  })

  describe('Users role protection', () => {
    it('a non-admin cannot change their own role', async () => {
      const updated = await payload.update({
        collection: 'users',
        id: authorA.id,
        data: { role: 'admin' },
        overrideAccess: false,
        user: authorA,
      })

      expect(updated.role).toBe('author')
    })

    it('an admin can change a user role', async () => {
      const updated = await payload.update({
        collection: 'users',
        id: authorA.id,
        data: { role: 'admin' },
        overrideAccess: false,
        user: admin,
      })

      expect(updated.role).toBe('admin')
    })
  })

  describe('Users email field protection', () => {
    it('email is hidden from anonymous readers', async () => {
      const res = await payload.findByID({ collection: 'users', id: authorB.id, overrideAccess: false })
      expect(res.email).toBeUndefined()
      // public author fields remain visible
      expect(res.name).toBe('Bo')
    })

    it('email is hidden from other authenticated users', async () => {
      const res = await payload.findByID({
        collection: 'users',
        id: authorB.id,
        overrideAccess: false,
        user: authorA,
      })
      expect(res.email).toBeUndefined()
    })

    it('a user can read their own email', async () => {
      const res = await payload.findByID({
        collection: 'users',
        id: authorA.id,
        overrideAccess: false,
        user: authorA,
      })
      expect(res.email).toBe('a@example.com')
    })

    it('an admin can read any email', async () => {
      const res = await payload.findByID({
        collection: 'users',
        id: authorB.id,
        overrideAccess: false,
        user: admin,
      })
      expect(res.email).toBe('b@example.com')
    })
  })

  describe('Users create/delete', () => {
    it('an author cannot create a user', async () => {
      await expect(
        payload.create({
          collection: 'users',
          data: { name: 'Sneaky', email: 'sneaky@example.com', password: 'x-very-long-pw', role: 'admin' },
          overrideAccess: false,
          user: authorA,
        }),
      ).rejects.toThrow()
    })
  })
})
