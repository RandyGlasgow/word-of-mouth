/** Read the EXIF orientation tag (1-8) from a JPEG buffer, or null when the
 *  file has none. Orientations 5-8 mean the camera stored the pixels rotated
 *  90°, so the displayed width/height are swapped relative to the raw pixel
 *  dimensions. */
export function exifOrientation(buf: Buffer): number | null {
  if (buf.length < 4 || buf[0] !== 0xff || buf[1] !== 0xd8) return null // not a JPEG

  let offset = 2
  while (offset + 4 <= buf.length) {
    if (buf[offset] !== 0xff) return null
    const marker = buf[offset + 1]
    if (marker === 0xda || marker === 0xd9) return null // image data / EOI: no EXIF
    const size = buf.readUInt16BE(offset + 2)
    if (marker === 0xe1 && buf.subarray(offset + 4, offset + 10).equals(EXIF_HEADER)) {
      return orientationFromTiff(buf.subarray(offset + 10, offset + 2 + size))
    }
    offset += 2 + size
  }
  return null
}

const EXIF_HEADER = Buffer.from('Exif\0\0', 'latin1')

function orientationFromTiff(tiff: Buffer): number | null {
  if (tiff.length < 8) return null
  const little = tiff[0] === 0x49 && tiff[1] === 0x49
  if (!little && !(tiff[0] === 0x4d && tiff[1] === 0x4d)) return null
  const u16 = (o: number) => (little ? tiff.readUInt16LE(o) : tiff.readUInt16BE(o))
  const u32 = (o: number) => (little ? tiff.readUInt32LE(o) : tiff.readUInt32BE(o))

  const ifdOffset = u32(4)
  if (ifdOffset + 2 > tiff.length) return null
  const entries = u16(ifdOffset)
  for (let i = 0; i < entries; i++) {
    const entry = ifdOffset + 2 + i * 12
    if (entry + 12 > tiff.length) return null
    if (u16(entry) === 0x0112) {
      const value = u16(entry + 8)
      return value >= 1 && value <= 8 ? value : null
    }
  }
  return null
}

/** True when the orientation stores pixels rotated 90°, i.e. rendered
 *  width/height are the raw dimensions swapped. */
export const isRotated90 = (orientation: number | null): boolean =>
  orientation !== null && orientation >= 5
