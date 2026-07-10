/**
 * Pull coordinates (and a place name when present) out of a pasted Google Maps
 * URL, so an author never has to type latitude/longitude by hand. Pure and
 * Payload-free so it can be unit tested in isolation; the collection hook wires
 * it into saves and handles short-link resolution.
 */

export type ParsedLocation = {
  /** GeoJSON order: [lng, lat]. */
  point: [number, number]
  placeName?: string
}

// A Google Maps host: the `google` domain under a real public suffix (a single
// ccTLD/gTLD like .com/.de, or a co./com. second level like .co.uk/.com.au),
// optionally subdomained (maps., www.), plus the goo.gl shorteners. The suffix
// is constrained so lookalikes where `google` is only a subdomain of an
// attacker's registrable domain — `google.evil.com`, `google.com.evil.com` —
// do not pass. A bare `[a-z.]+` suffix here would wave those through.
const GOOGLE_HOST = /(^|\.)(google\.(?:[a-z]{2,}|(?:co|com)\.[a-z]{2,})|goo\.gl)$/i

// A signed decimal, e.g. -9.13 or 38.
const NUM = '(-?\\d+(?:\\.\\d+)?)'

const isValidLat = (n: number): boolean => Number.isFinite(n) && n >= -90 && n <= 90
const isValidLng = (n: number): boolean => Number.isFinite(n) && n >= -180 && n <= 180

const asCoords = (latStr: string, lngStr: string): { lat: number; lng: number } | null => {
  const lat = parseFloat(latStr)
  const lng = parseFloat(lngStr)
  return isValidLat(lat) && isValidLng(lng) ? { lat, lng } : null
}

/**
 * Coordinates can appear in several places in a Maps URL. Preference order,
 * most-specific first:
 *   1. `!3d<lat>!4d<lng>` — the exact pin of a place page.
 *   2. `?q=<lat>,<lng>` / `?query=<lat>,<lng>` — an explicit coordinate query.
 *   3. `@<lat>,<lng>,<zoom>z` — the map viewport center, only a rough fallback.
 */
const extractCoords = (url: URL): { lat: number; lng: number } | null => {
  const { href } = url

  const data = href.match(new RegExp(`!3d${NUM}!4d${NUM}`))
  if (data) {
    const coords = asCoords(data[1], data[2])
    if (coords) return coords
  }

  const q = url.searchParams.get('q') ?? url.searchParams.get('query')
  if (q) {
    const m = q.match(new RegExp(`^\\s*${NUM},\\s*${NUM}`))
    if (m) {
      const coords = asCoords(m[1], m[2])
      if (coords) return coords
    }
  }

  const at = href.match(new RegExp(`@${NUM},${NUM}`))
  if (at) {
    const coords = asCoords(at[1], at[2])
    if (coords) return coords
  }

  return null
}

/** The `/maps/place/<name>/` segment, URL-decoded with `+` treated as a space. */
const extractPlaceName = (pathname: string): string | undefined => {
  const m = pathname.match(/\/maps\/place\/([^/]+)/)
  if (!m) return undefined
  try {
    const name = decodeURIComponent(m[1].replace(/\+/g, ' ')).trim()
    return name.length > 0 ? name : undefined
  } catch {
    return undefined
  }
}

/** Parse a full Google Maps URL; returns null for non-Google or coordinate-less URLs. */
export const parseMapsUrl = (input: string): ParsedLocation | null => {
  let url: URL
  try {
    url = new URL(input)
  } catch {
    return null
  }
  if (!GOOGLE_HOST.test(url.hostname)) return null

  const coords = extractCoords(url)
  if (!coords) return null

  const result: ParsedLocation = { point: [coords.lng, coords.lat] }
  const placeName = extractPlaceName(url.pathname)
  if (placeName) result.placeName = placeName
  return result
}

/** A Google Maps short link that must be resolved server-side before parsing. */
export const isShortLink = (input: string): boolean => {
  try {
    const { hostname, pathname } = new URL(input)
    if (hostname === 'maps.app.goo.gl') return true
    if (hostname === 'goo.gl') return pathname.startsWith('/maps')
    return false
  } catch {
    return false
  }
}

/**
 * Follow a short link one hop and return its `Location` target, without letting
 * fetch auto-follow (we only want the redirect URL, not the page body). Returns
 * null if there is no redirect. Network errors propagate to the caller.
 */
export const resolveShortLink = async (input: string): Promise<string | null> => {
  const res = await fetch(input, { redirect: 'manual' })
  return res.headers.get('location')
}
