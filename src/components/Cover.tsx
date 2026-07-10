import Image from 'next/image'
import React from 'react'

import type { Media } from '@/payload-types'

import { mediaInfo } from './media'

/** Renders a cover image when the media relationship is populated with a real
 *  file; renders nothing otherwise (posts and places without imagery stay
 *  clean rather than showing a broken frame). */
export function Cover({ media }: { media: number | Media | null | undefined }) {
  const info = mediaInfo(media)
  if (!info || info.width === undefined || info.height === undefined) return null
  return (
    <figure className="cover">
      <Image
        src={info.url}
        alt={info.alt}
        width={info.width}
        height={info.height}
        sizes="(min-width: 1024px) 60vw, 100vw"
      />
    </figure>
  )
}
