import type { CollectionConfig } from 'payload'

import { slugField } from '../fields/slug'
import { isAdmin, isAuthenticated } from '../access'
import { revalidateCity } from '../hooks/revalidate'

export const Cities: CollectionConfig = {
  slug: 'cities',
  access: {
    read: () => true,
    create: isAuthenticated,
    update: isAdmin,
    delete: isAdmin,
  },
  hooks: {
    afterChange: [revalidateCity],
  },
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
