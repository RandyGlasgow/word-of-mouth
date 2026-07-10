import type { CollectionConfig } from 'payload'

import { slugField } from '../fields/slug'

export const People: CollectionConfig = {
  slug: 'people',
  admin: {
    useAsTitle: 'name',
  },
  fields: [
    {
      name: 'name',
      type: 'text',
      required: true,
    },
    slugField('name'),
    {
      name: 'photo',
      type: 'upload',
      relationTo: 'media',
    },
    {
      name: 'note',
      type: 'text',
      admin: {
        description: 'Who they are, e.g. "bartender in Lisbon"',
      },
    },
    {
      // The referral-graph edge: how this person entered the circle.
      name: 'metVia',
      type: 'relationship',
      relationTo: ['people', 'posts'],
    },
  ],
}
