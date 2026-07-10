import type { PopulatedPost } from '@/lib/queries'
import type { Post } from '@/payload-types'

import { LocationMapLoader } from './LocationMapLoader'

/** The `location` group shared by Posts and Cities (see src/fields/location.ts). */
export type PostLocation = NonNullable<Post['location']>

/** Zoom levels: tight on a specific place, wider when falling back to the city. */
export const POST_ZOOM = 19
export const CITY_ZOOM = 11

type WithCoords = PostLocation & { lat: number; lng: number }

const hasCoords = (l?: PostLocation | null): l is WithCoords =>
  !!l && typeof l.lat === 'number' && typeof l.lng === 'number'

const hasUrl = (l?: PostLocation | null): l is PostLocation & { mapsUrl: string } =>
  !!l && !!l.mapsUrl

/**
 * Pick which location pins the post and how far to zoom: the post's own
 * location when it carries coordinates, otherwise the city's. When neither has
 * coordinates a URL-only location still yields a link-only card (legacy data).
 * Returns null when there is nothing to show.
 */
export function resolvePostLocation(
  post: PopulatedPost,
): { location: PostLocation; zoom: number } | null {
  const city = post.city?.location
  if (hasCoords(post.location)) return { location: post.location, zoom: POST_ZOOM }
  if (hasCoords(city)) return { location: city, zoom: CITY_ZOOM }
  if (hasUrl(post.location)) return { location: post.location, zoom: POST_ZOOM }
  if (hasUrl(city)) return { location: city, zoom: CITY_ZOOM }
  return null
}

const googleMapsHref = (location: PostLocation): string =>
  location.mapsUrl
    ? location.mapsUrl
    : `https://www.google.com/maps/search/?api=1&query=${location.lat},${location.lng}`

/**
 * Rail card for a post's location: a Leaflet mini-map (when coordinates exist)
 * over the place name and a link out to Google Maps. With a URL but no
 * coordinates it renders link-only. Server component — the map is the only
 * client island (see {@link ./LocationMapLoader}).
 */
export function LocationCard({ location, zoom }: { location: PostLocation; zoom: number }) {
  return (
    <section className="rail__card">
      <p className="rail__label">Location</p>
      {hasCoords(location) && (
        <LocationMapLoader
          lat={location.lat}
          lng={location.lng}
          zoom={zoom}
          placeName={location.placeName}
        />
      )}
      {location.placeName && <p className="rail__place">{location.placeName}</p>}
      <a
        className="rail__maplink"
        href={googleMapsHref(location)}
        target="_blank"
        rel="noopener noreferrer"
      >
        Open in Google Maps ↗
      </a>
    </section>
  )
}
