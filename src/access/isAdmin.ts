import type { Access, FieldAccess } from 'payload'

/** Collection-level: only admins. */
export const isAdmin: Access = ({ req: { user } }) => user?.role === 'admin'

/** Field-level: only admins (used to lock down protected fields like `role`). */
export const isAdminFieldAccess: FieldAccess = ({ req: { user } }) => user?.role === 'admin'
