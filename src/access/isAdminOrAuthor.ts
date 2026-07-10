import type { Access } from 'payload'

/**
 * Collection-level for Posts update/delete: admins act on any post; authors are
 * constrained to posts they own via a query on the `author` relationship.
 */
export const isAdminOrAuthor: Access = ({ req: { user } }) => {
  if (!user) return false
  if (user.role === 'admin') return true
  return { author: { equals: user.id } }
}
