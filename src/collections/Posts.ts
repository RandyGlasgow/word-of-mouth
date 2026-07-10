import type { CollectionConfig } from 'payload'

import { slugField } from '../fields/slug'
import { locationField } from '../fields/location'
import { isAdminOrAuthor, isAuthenticated, publishedOrOwn } from '../access'
import { resolveLocation } from '../hooks/location'
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
    beforeChange: [resolveLocation],
    afterChange: [revalidatePost],
    afterDelete: [revalidatePostDelete],
  },
  admin: {
    useAsTitle: 'title',
    defaultColumns: ['title', 'city', 'author', 'publishedDate', '_status'],
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
    locationField(),
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
      name: 'city',
      type: 'relationship',
      relationTo: 'cities',
      required: true,
      admin: {
        position: 'sidebar',
      },
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
