/**
 * One-off repair: swap stored width/height on media docs whose file carries an
 * EXIF orientation of 5-8 (pixels stored rotated 90°). New uploads are
 * normalized by the Media collection's beforeChange hook; this fixes docs
 * uploaded before that hook existed.
 *
 * Run:
 *   DATABASE_URL=postgres://wom:wom@127.0.0.1:5432/word_of_mouth \
 *     npx pnpm@10 exec tsx scripts/fix-media-orientation.ts
 */
import fs from 'fs'
import path from 'path'

import { getPayload } from 'payload'

import { exifOrientation, isRotated90 } from '../src/lib/exifOrientation'
import config from '../src/payload.config'

const MEDIA_DIR = path.resolve(import.meta.dirname, '../media')

const payload = await getPayload({ config })

const { docs } = await payload.find({ collection: 'media', limit: 500, depth: 0 })

let fixed = 0
for (const doc of docs) {
  if (!doc.filename || !doc.width || !doc.height) continue
  const filePath = path.join(MEDIA_DIR, doc.filename)
  if (!fs.existsSync(filePath)) {
    console.warn(`skip ${doc.filename}: file not found`)
    continue
  }
  const orientation = exifOrientation(fs.readFileSync(filePath))
  // Rotated files should have portrait-vs-landscape flipped; only touch docs
  // still carrying the raw (unswapped) dimensions.
  if (!isRotated90(orientation)) continue
  const rendersPortrait = doc.width > doc.height // raw landscape -> displays portrait
  await payload.update({
    collection: 'media',
    id: doc.id,
    data: { width: doc.height, height: doc.width },
  })
  fixed++
  console.log(
    `fixed ${doc.filename}: ${doc.width}x${doc.height} -> ${doc.height}x${doc.width}` +
      (rendersPortrait ? ' (displays portrait)' : ' (displays landscape)'),
  )
}

console.log(`done: ${fixed} of ${docs.length} media docs updated`)
process.exit(0)
