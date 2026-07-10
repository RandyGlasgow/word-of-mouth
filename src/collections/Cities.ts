import type { CollectionConfig } from 'payload'

import { slugField } from '../fields/slug'

export const Cities: CollectionConfig = {
  slug: 'cities',
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
      name: 'country',
      type: 'relationship',
      relationTo: 'countries',
      required: true,
    },
    {
      name: 'intro',
      type: 'textarea',
    },
    {
      name: 'cover',
      type: 'upload',
      relationTo: 'media',
    },
  ],
}
