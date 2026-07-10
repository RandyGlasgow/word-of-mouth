import type { Media } from '@/payload-types'

/** Pull a usable URL + alt from a media relationship that may be an id, null,
 *  or a populated Media doc. Returns null when there's nothing to render. */
export const mediaInfo = (
  value: number | Media | null | undefined,
): { url: string; alt: string; width?: number; height?: number } | null => {
  if (!value || typeof value === 'number') return null
  if (!value.url) return null
  return {
    url: value.url,
    alt: value.alt ?? '',
    width: value.width ?? undefined,
    height: value.height ?? undefined,
  }
}
