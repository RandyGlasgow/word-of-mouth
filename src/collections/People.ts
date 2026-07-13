import type { CollectionConfig } from 'payload'

import { slugField } from '../fields/slug'
import { isAdmin, isAuthenticated } from '../access'

export const People: CollectionConfig = {
  slug: 'people',
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
      // Where you met them — a Place (Post-backed or incidental). Optional.
      name: 'metAt',
      type: 'relationship',
      relationTo: 'places',
    },
    {
      // Who introduced you. The human referral edge, separate from the place.
      name: 'metThrough',
      type: 'relationship',
      relationTo: 'people',
    },
    {
      name: 'metOn',
      type: 'date',
      admin: {
        date: { pickerAppearance: 'dayOnly' },
      },
    },
  ],
}
