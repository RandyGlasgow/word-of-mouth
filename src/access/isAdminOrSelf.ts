import type { Access, FieldAccess } from 'payload'

/**
 * Collection-level: admins see/act on everyone; other users are constrained to
 * their own record via a query. Used for Users update so an author can edit
 * their own profile but not others.
 */
export const isAdminOrSelf: Access = ({ req: { user } }) => {
  if (!user) return false
  if (user.role === 'admin') return true
  return { id: { equals: user.id } }
}

/** Field-level variant for protecting a field like `email` to self-or-admin. */
export const isAdminOrSelfFieldAccess: FieldAccess = ({ req: { user }, id }) => {
  if (!user) return false
  if (user.role === 'admin') return true
  return user.id === id
}
