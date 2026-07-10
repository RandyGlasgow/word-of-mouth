import React from 'react'

import type { PopulatedPost } from '@/lib/queries'

import { PostCard } from './PostCard'

export function PostList({
  posts,
  context = 'global',
}: {
  posts: PopulatedPost[]
  context?: 'global' | 'country' | 'city'
}) {
  if (posts.length === 0) {
    return <p className="empty">No write-ups here yet.</p>
  }
  return (
    <div className="post-list">
      {posts.map((post) => (
        <PostCard key={post.id} post={post} context={context} />
      ))}
    </div>
  )
}
