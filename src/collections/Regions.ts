import type { CollectionConfig } from 'payload'

import { slugField } from '../fields/slug'
import { isAdmin, isAuthenticated } from '../access'

export const Regions: CollectionConfig = {
  slug: 'regions',
  access: {
    read: () => true,
    create: isAuthenticated,
    update: isAdmin,
    delete: isAdmin,
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
    {
      name: 'code',
      type: 'text',
    },
    slugField('name'),
    {
      name: 'country',
      type: 'relationship',
      relationTo: 'countries',
      required: true,
    },
  ],
}
