'use client'

import dynamic from 'next/dynamic'

/**
 * Client wrapper that lazy-loads the Leaflet map with `ssr: false`. In Next 15+
 * `ssr: false` is only permitted inside a Client Component, so this boundary
 * exists purely to host the dynamic import; the server-rendered
 * {@link ./LocationCard} renders it directly.
 */
const LocationMap = dynamic(() => import('./LocationMap'), {
  ssr: false,
  loading: () => <div className="rail__map rail__map--loading" aria-hidden="true" />,
})

export function LocationMapLoader(props: {
  lat: number
  lng: number
  zoom: number
  placeName?: string | null
}) {
  return <LocationMap {...props} />
}
