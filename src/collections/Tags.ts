import type { CollectionConfig } from 'payload'

import { slugField } from '../fields/slug'
import { isAdmin, isAuthenticated } from '../access'

export const Tags: CollectionConfig = {
  slug: 'tags',
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
    slugField('name'),
  ],
}
