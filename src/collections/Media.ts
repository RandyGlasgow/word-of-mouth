import type { CollectionBeforeChangeHook, CollectionConfig } from 'payload'

import { isAdmin, isAuthenticated } from '../access'
import { exifOrientation, isRotated90 } from '../lib/exifOrientation'

/** Payload stores the raw pixel dimensions, but browsers and the Next image
 *  optimizer honor the EXIF orientation tag — a photo shot rotated 90°
 *  displays with width and height swapped. Swap the stored dimensions so they
 *  match what actually renders. */
const normalizeOrientation: CollectionBeforeChangeHook = ({ data, req }) => {
  const file = req.file
  if (!file?.data || !data?.width || !data?.height) return data
  if (!isRotated90(exifOrientation(file.data))) return data
  return { ...data, width: data.height, height: data.width }
}

export const Media: CollectionConfig = {
  slug: 'media',
  access: {
    read: () => true,
    create: isAuthenticated,
    update: isAdmin,
    delete: isAdmin,
  },
  hooks: {
    beforeChange: [normalizeOrientation],
  },
  fields: [
    {
      name: 'alt',
      type: 'text',
      required: true,
    },
  ],
  upload: true,
}
