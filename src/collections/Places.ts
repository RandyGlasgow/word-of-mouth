import type { CollectionConfig } from 'payload'

import { slugField } from '../fields/slug'
import { locationField } from '../fields/location'
import { isAdmin, isAuthenticated } from '../access'
import { resolveLocation } from '../hooks/location'

export const Places: CollectionConfig = {
  slug: 'places',
  access: {
    read: () => true,
    create: isAuthenticated,
    update: isAdmin,
    delete: isAdmin,
  },
  hooks: {
    beforeChange: [resolveLocation],
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
    locationField(),
    {
      name: 'city',
      type: 'relationship',
      relationTo: 'cities',
    },
    {
      name: 'note',
      type: 'text',
    },
  ],
}
