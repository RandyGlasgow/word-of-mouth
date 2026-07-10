import type { CollectionBeforeChangeHook } from 'payload'

import { ValidationError } from 'payload'

import { isShortLink, parseMapsUrl, resolveShortLink } from '../lib/mapsUrl'

/**
 * Turn a pasted Google Maps URL into stored coordinates. Runs only when
 * `location.mapsUrl` actually changed, so a hand-edited `lat`/`lng` survives any
 * unrelated save. A short link is resolved server-side (one redirect hop) before
 * parsing. An unparseable URL blocks the save with an author-facing message.
 *
 * Shared by every collection that uses `locationField()`.
 */

type LocationGroup = {
  mapsUrl?: string | null
  placeName?: string | null
  lat?: number | null
  lng?: number | null
}

const invalidUrlError = (): ValidationError =>
  new ValidationError({
    errors: [
      {
        path: 'location.mapsUrl',
        message:
          "Couldn't find coordinates in this link — paste the full URL from your browser's address bar.",
      },
    ],
  })

export const resolveLocation: CollectionBeforeChangeHook = async ({ data, originalDoc }) => {
  const location: LocationGroup | undefined = data?.location
  const mapsUrl = location?.mapsUrl
  if (!location || !mapsUrl) return data

  const previousUrl = (originalDoc?.location as LocationGroup | undefined)?.mapsUrl
  if (mapsUrl === previousUrl) return data

  let target = mapsUrl
  if (isShortLink(mapsUrl)) {
    try {
      const resolved = await resolveShortLink(mapsUrl)
      if (resolved) target = resolved
    } catch {
      // Fall through: parsing the unresolved short link yields no coordinates,
      // which surfaces as the same author-facing validation error below.
    }
  }

  const parsed = parseMapsUrl(target)
  if (!parsed) throw invalidUrlError()

  const [lng, lat] = parsed.point
  location.lat = lat
  location.lng = lng
  // Prefill the place name only when the author has not written one.
  if (parsed.placeName && !location.placeName) {
    location.placeName = parsed.placeName
  }

  return data
}
