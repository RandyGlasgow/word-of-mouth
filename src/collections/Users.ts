import type { CollectionConfig } from 'payload'

import { slugField } from '../fields/slug'
import {
  isAdmin,
  isAdminFieldAccess,
  isAdminOrSelf,
  isAdminOrSelfFieldAccess,
} from '../access'

export const Users: CollectionConfig = {
  slug: 'users',
  access: {
    // Public read powers author pages (name/slug/bio/avatar); the `email`
    // field is locked down separately below.
    read: () => true,
    create: isAdmin,
    update: isAdminOrSelf,
    delete: isAdmin,
  },
  admin: {
    useAsTitle: 'name',
  },
  auth: true,
  fields: [
    {
      // Override the auth-provided email field to hide it from other users;
      // author pages are public but email is not.
      name: 'email',
      type: 'email',
      access: {
        read: isAdminOrSelfFieldAccess,
      },
    },
    {
      name: 'name',
      type: 'text',
      required: true,
    },
    slugField('name'),
    {
      name: 'avatar',
      type: 'upload',
      relationTo: 'media',
    },
    {
      name: 'bio',
      type: 'textarea',
    },
    {
      name: 'role',
      type: 'select',
      required: true,
      defaultValue: 'author',
      // Authors must not be able to promote themselves; only admins set roles.
      access: {
        update: isAdminFieldAccess,
      },
      options: [
        { label: 'Admin', value: 'admin' },
        { label: 'Author', value: 'author' },
      ],
    },
  ],
  versions: false,
}
