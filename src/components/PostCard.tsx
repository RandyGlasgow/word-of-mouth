import Link from 'next/link'
import React from 'react'

import { cityLabel } from '@/lib/cityLabel'
import { authorHref, postHref, type PopulatedPost } from '@/lib/queries'

import { formatDate } from './format'

/** A single write-up as it appears in an index: title, excerpt, and a meta
 *  line. `context` tunes which meta bits are worth showing — e.g. inside a
 *  city section the city name is redundant. */
export function PostCard({
  post,
  context = 'global',
}: {
  post: PopulatedPost
  context?: 'global' | 'country' | 'city'
}) {
  const showCity = context === 'global' || context === 'country'

  return (
    <article className="post-card">
      <h3 className="post-card__title">
        <Link href={postHref(post)}>{post.title}</Link>
      </h3>
      {post.excerpt && <p className="post-card__excerpt">{post.excerpt}</p>}
      <div className="post-card__meta">
        <span>{formatDate(post.publishedDate)}</span>
        {showCity && (
          <span className="dot tag">{cityLabel(post.place.city)}</span>
        )}
        <span className="dot">
          by <Link href={authorHref(post.author)}>{post.author.name}</Link>
        </span>
        {post.referredBy && <span className="dot">suggested by {post.referredBy.name}</span>}
      </div>
    </article>
  )
}
