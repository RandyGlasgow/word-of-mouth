import type { Access, Where } from 'payload'

/**
 * Posts read access. Admins read everything. Everyone else — including
 * anonymous visitors — reads published posts; a logged-in author additionally
 * reads their own drafts.
 */
export const publishedOrOwn: Access = ({ req: { user } }) => {
  if (user?.role === 'admin') return true
  const published: Where = { _status: { equals: 'published' } }
  if (user) {
    return { or: [published, { author: { equals: user.id } }] }
  }
  return published
}
