import type { CollectionConfig, RelationshipFieldSingleValidation } from 'payload'

import { slugField } from '../fields/slug'
import { isAdminOrAuthor, isAuthenticated, publishedOrOwn } from '../access'
import { revalidatePost, revalidatePostDelete } from '../hooks/revalidate'

export const Posts: CollectionConfig = {
  slug: 'posts',
  access: {
    read: publishedOrOwn,
    create: isAuthenticated,
    update: isAdminOrAuthor,
    delete: isAdminOrAuthor,
  },
  hooks: {
    afterChange: [revalidatePost],
    afterDelete: [revalidatePostDelete],
  },
  admin: {
    useAsTitle: 'title',
    defaultColumns: ['title', 'place', 'author', 'publishedDate', '_status'],
  },
  versions: {
    drafts: true,
  },
  fields: [
    {
      name: 'title',
      type: 'text',
      required: true,
    },
    slugField('title'),
    {
      name: 'excerpt',
      type: 'textarea',
    },
    {
      name: 'body',
      type: 'richText',
      required: true,
    },
    {
      name: 'cover',
      type: 'upload',
      relationTo: 'media',
    },
    {
      name: 'gallery',
      type: 'upload',
      relationTo: 'media',
      hasMany: true,
    },
    {
      // The year segment of the post URL derives from this date.
      name: 'publishedDate',
      type: 'date',
      required: true,
      defaultValue: () => new Date().toISOString(),
      admin: {
        position: 'sidebar',
        date: { pickerAppearance: 'dayOnly' },
      },
    },
    {
      // A Post is always a write-up of a specific Place; city/country and the
      // map pin are derived from post.place, not stored on the post.
      name: 'place',
      type: 'relationship',
      relationTo: 'places',
      required: true,
      admin: {
        position: 'sidebar',
      },
      // A post's URL is /[year]/[country]/[city]/[slug]; the city/country come
      // from place.city, so a post's Place must have a city. Cityless Places are
      // valid only as incidental encounter spots (see Person.metAt). A custom
      // validate replaces Payload's built-in, so re-check presence/existence too.
      validate: (async (value, { req }) => {
        if (value == null) return 'A post must be about a place.'
        const id = typeof value === 'object' ? value.value : value
        let place
        try {
          place = await req.payload.findByID({ collection: 'places', id, depth: 0, req })
        } catch {
          return 'Selected place was not found.'
        }
        if (!place.city) {
          return "A post's place must belong to a city (needed for the post URL)."
        }
        return true
      }) as RelationshipFieldSingleValidation,
    },
    {
      name: 'referredBy',
      type: 'relationship',
      relationTo: 'people',
      admin: {
        position: 'sidebar',
        description: 'Who suggested this place (optional)',
      },
    },
    {
      name: 'tags',
      type: 'relationship',
      relationTo: 'tags',
      hasMany: true,
      admin: {
        position: 'sidebar',
        description: 'Cluster this recommendation (e.g. coffee, bars)',
      },
    },
    {
      name: 'author',
      type: 'relationship',
      relationTo: 'users',
      required: true,
      defaultValue: ({ user }) => user?.id,
      admin: {
        position: 'sidebar',
      },
    },
  ],
}
