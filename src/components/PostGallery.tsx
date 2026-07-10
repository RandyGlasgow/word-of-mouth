'use client'

import Image from 'next/image'
import React from 'react'
import {
  MasonryPhotoAlbum,
  type Photo,
  type RenderImageContext,
  type RenderImageProps,
} from 'react-photo-album'
import Lightbox, { type SlideImage } from 'yet-another-react-lightbox'

import 'react-photo-album/masonry.css'
import 'yet-another-react-lightbox/styles.css'

export type GalleryPhoto = {
  url: string
  alt: string
  width: number
  height: number
}

/** Post imagery: an optional full-width cover figure plus a masonry grid of
 *  the gallery photos, all wired to one shared fullscreen lightbox. When a
 *  cover exists it is slide 0 and gallery tile n is slide n+1; without one the
 *  tiles map straight to their slide index — a coverless post never promotes a
 *  gallery photo into the hero slot.
 *
 *  `children` render between the cover and the masonry grid — pass the article
 *  body here so it stays server-rendered while sitting in its natural position
 *  (cover, body, then gallery). */
export function PostGallery({
  cover,
  photos,
  children,
}: {
  cover?: GalleryPhoto | null
  photos: GalleryPhoto[]
  children?: React.ReactNode
}) {
  const [index, setIndex] = React.useState(-1)

  if (!cover && photos.length === 0) return <>{children}</>

  const gallery = photos

  const galleryTiles: Photo[] = gallery.map((p) => ({
    src: p.url,
    alt: p.alt,
    width: p.width,
    height: p.height,
  }))

  const slides: SlideImage[] = (cover ? [cover, ...gallery] : gallery).map((p) => ({
    src: p.url,
    alt: p.alt,
    width: p.width,
    height: p.height,
  }))
  const tileOffset = cover ? 1 : 0

  return (
    <>
      {cover && (
        <figure className="cover cover--interactive">
          <button
            type="button"
            className="cover__button"
            aria-label="View cover image full screen"
            onClick={() => setIndex(0)}
          >
            <Image
              quality={10}
              src={cover.url}
              alt={cover.alt}
              width={cover.width}
              height={cover.height}
              sizes="(min-width: 1024px) 60vw, 100vw"
              priority
              loading="eager"
            />
          </button>
        </figure>
      )}

      {children}

      {galleryTiles.length > 0 && (
        <div className="gallery">
          <MasonryPhotoAlbum
            photos={galleryTiles}
            defaultContainerWidth={720}
            columns={(containerWidth) => (containerWidth < 480 ? 2 : 3)}
            spacing={12}
            sizes={{ size: '100vw', sizes: [{ viewport: '(min-width: 1024px)', size: '60vw' }] }}
            render={{ image: renderNextImage }}
            onClick={({ index: i }) => setIndex(i + tileOffset)}
          />
        </div>
      )}

      <Lightbox open={index >= 0} close={() => setIndex(-1)} index={index} slides={slides} />
    </>
  )
}

function renderNextImage(
  { alt = '', title, sizes }: RenderImageProps,
  { photo, width, height }: RenderImageContext<Photo>,
) {
  return (
    <div
      className="gallery__tile"
      style={{ width: '100%', position: 'relative', aspectRatio: `${width} / ${height}` }}
    >
      <Image quality={80} fill src={photo.src} alt={alt} title={title} sizes={sizes} />
    </div>
  )
}
