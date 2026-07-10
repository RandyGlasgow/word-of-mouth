import type { Access } from 'payload'

/** Any logged-in user. Authors need this to create posts, places, and people. */
export const isAuthenticated: Access = ({ req: { user } }) => Boolean(user)
