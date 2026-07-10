import React from 'react'

import type { Media } from '@/payload-types'

import { mediaInfo } from './media'

/** Renders a cover image when the media relationship is populated with a real
 *  file; renders nothing otherwise (posts and places without imagery stay
 *  clean rather than showing a broken frame). */
export function Cover({ media }: { media: number | Media | null | undefined }) {
  const info = mediaInfo(media)
  if (!info) return null
  return (
    <figure className="cover">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={info.url} alt={info.alt} width={info.width} height={info.height} />
    </figure>
  )
}
