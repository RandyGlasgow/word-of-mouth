import type { CollectionConfig } from 'payload'

import { slugField } from '../fields/slug'
import { isAdmin, isAuthenticated } from '../access'
import { revalidateCountry } from '../hooks/revalidate'

export const Countries: CollectionConfig = {
  slug: 'countries',
  access: {
    read: () => true,
    create: isAuthenticated,
    update: isAdmin,
    delete: isAdmin,
  },
  hooks: {
    afterChange: [revalidateCountry],
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
