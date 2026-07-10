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
  for (const slug of ['post-views', 'posts', 'people', 'cities', 'countries', 'media', 'users'] as const) {
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
