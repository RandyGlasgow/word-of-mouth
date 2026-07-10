import type { CollectionConfig } from 'payload'

import { isAdmin } from '../access'

/**
 * One row per (post, visitor) — unique-visitor view tracking.
 * Hidden from the admin UI; written only by the views API route,
 * read only via aggregate count. Never stored on the post itself.
 */
export const PostViews: CollectionConfig = {
  slug: 'post-views',
  admin: {
    hidden: true,
  },
  // Locked down: no public REST/GraphQL access. The views route handler
  // writes via the Local API with overrideAccess, and counts are read via
  // payload.count (also overrideAccess). Admins may read for inspection.
  access: {
    read: isAdmin,
    create: () => false,
    update: () => false,
    delete: () => false,
  },
  indexes: [
    {
      fields: ['post', 'visitor'],
      unique: true,
    },
  ],
  fields: [
    {
      name: 'post',
      type: 'relationship',
      relationTo: 'posts',
      required: true,
      index: true,
    },
    {
      // Anonymous UUID from the visitor cookie — no PII.
      name: 'visitor',
      type: 'text',
      required: true,
      index: true,
    },
  ],
  timestamps: true,
}
