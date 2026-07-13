import Image from 'next/image'
import Link from 'next/link'
import React from 'react'

import { cityLabel } from '@/lib/cityLabel'
import { encounterCaption } from '@/lib/encounter'
import { authorHref, postHref, type PopulatedPost } from '@/lib/queries'
import { ViewCount } from '@/views'

import { formatDate } from './format'
import { LocationCard, resolvePostLocation } from './LocationCard'
import { mediaInfo } from './media'

/** The post page's right-hand aside: author, who suggested the place, a view
 *  count, more from the same city, and a reserved slot for a future ad/widget.
 *  Stacks below the article on mobile (see .post-layout / .rail in styles.css). */
export function Rail({
  post,
  moreFromCity,
}: {
  post: PopulatedPost
  moreFromCity: PopulatedPost[]
}) {
  const avatar = mediaInfo(post.author.avatar)
  const location = resolvePostLocation(post)
  const encounter = post.referredBy ? encounterCaption(post.referredBy) : null

  return (
    <aside className="rail">
      <section className="rail__card">
        <p className="rail__label">Written by</p>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          {avatar && (
            <Image className="avatar" src={avatar.url} alt={avatar.alt} width={48} height={48} />
          )}
          <span className="rail__name">
            <Link href={authorHref(post.author)}>{post.author.name}</Link>
          </span>
        </div>
        {post.author.bio && <p className="rail__note">{post.author.bio}</p>}
      </section>

      {post.referredBy && (
        <section className="rail__card">
          <p className="rail__label">Suggested by</p>
          <span className="rail__name">{post.referredBy.name}</span>
          {post.referredBy.note && <p className="rail__note">{post.referredBy.note}</p>}
          {encounter?.met && <p className="rail__meta">{encounter.met}</p>}
          {encounter?.intro && <p className="rail__meta">{encounter.intro}</p>}
        </section>
      )}

      {location && <LocationCard location={location.location} zoom={location.zoom} />}

      <section className="rail__card">
        <p className="rail__label">Views</p>
        <div className="rail__viewcount">
          <ViewCount postId={post.id} />
        </div>
      </section>

      {moreFromCity.length > 0 && (
        <section className="rail__card">
          <p className="rail__label">More from {cityLabel(post.place.city)}</p>
          <ul className="rail__links">
            {moreFromCity.map((p) => (
              <li key={p.id}>
                <Link href={postHref(p)}>{p.title}</Link>
                <span className="meta">{formatDate(p.publishedDate)}</span>
              </li>
            ))}
          </ul>
        </section>
      )}

      <section className="rail__card">
        <div className="rail__ad">Reserved</div>
      </section>
    </aside>
  )
}
