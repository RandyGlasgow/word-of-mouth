import type { CollectionConfig } from 'payload'

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
