import type { Field } from 'payload'

const format = (value: string): string =>
  value
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')

/**
 * Slug field that auto-generates from another field when left blank.
 * URL segments across the site all come from these slugs.
 */
export const slugField = (from: string): Field => ({
  name: 'slug',
  type: 'text',
  index: true,
  unique: true,
  admin: {
    position: 'sidebar',
    description: `Leave blank to generate from ${from}`,
  },
  hooks: {
    beforeValidate: [
      ({ value, data }) => {
        const source = typeof value === 'string' && value.length > 0 ? value : data?.[from]
        return typeof source === 'string' ? format(source) : value
      },
    ],
  },
})
