'use client'

import * as L from 'leaflet'
import { useEffect, useRef } from 'react'

import 'leaflet/dist/leaflet.css'

/**
 * OpenStreetMap standard raster tiles — free, no API key, acceptable at this
 * site's traffic under the OSM tile usage policy. Kept in one constant so the
 * provider can be swapped later without touching the map component.
 */
export const OSM_TILE_URL = 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png'
export const OSM_ATTRIBUTION =
  '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'

/**
 * A `divIcon` (an HTML element styled in CSS) stands in for Leaflet's default
 * marker, whose PNGs resolve to broken paths under bundlers — Leaflet derives
 * their URLs from the relative path of its own stylesheet, which the bundler
 * rewrites. Drawing the pin ourselves sidesteps the images entirely.
 * See https://github.com/PaulLeCam/react-leaflet/issues/453
 */
const pinIcon = L.divIcon({
  className: 'location-pin',
  html: '<span class="location-pin__dot"></span>',
  iconSize: [18, 18],
  iconAnchor: [9, 9],
})

/**
 * Client-only Leaflet mini-map with a single marker. Loaded via `next/dynamic`
 * with `ssr: false` from {@link ./LocationMapLoader} because Leaflet touches
 * `window` at import time. Scroll-wheel zoom is off — it lives in a sidebar.
 */
export default function LocationMap({
  lat,
  lng,
  zoom,
  placeName,
}: {
  lat: number
  lng: number
  zoom: number
  placeName?: string | null
}) {
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const el = containerRef.current
    if (!el) return

    const map = L.map(el, {
      center: [lat, lng],
      zoom,
      scrollWheelZoom: false,
    })
    L.tileLayer(OSM_TILE_URL, { attribution: OSM_ATTRIBUTION, maxZoom: 19 }).addTo(map)
    const marker = L.marker([lat, lng], { icon: pinIcon, keyboard: false })
    if (placeName) {
      // Leaflet assigns a *string* tooltip via innerHTML — passing placeName
      // (auto-filled verbatim from a Google Maps URL segment) as a string would
      // be a stored-XSS sink. A DOM node with textContent set is appended, not
      // parsed, so any markup renders as literal text.
      const label = document.createElement('span')
      label.textContent = placeName
      marker.bindTooltip(label)
    }
    marker.addTo(map)

    return () => {
      map.remove()
    }
  }, [lat, lng, zoom, placeName])

  return (
    <div
      ref={containerRef}
      className="rail__map"
      role="img"
      aria-label={placeName ? `Map showing ${placeName}` : 'Map of this location'}
    />
  )
}
