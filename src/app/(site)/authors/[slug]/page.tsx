import { notFound } from 'next/navigation'
import React from 'react'

import { Breadcrumbs } from '@/components/Breadcrumbs'
import { mediaInfo } from '@/components/media'
import { PostList } from '@/components/PostList'
import { Stats } from '@/components/Stats'
import { coverageStats, getAuthorBySlug, getPostsByAuthor } from '@/lib/queries'

export const dynamicParams = true

export async function generateStaticParams() {
  const { getClient } = await import('@/lib/queries')
  const payload = await getClient()
  const { docs } = await payload.find({
    collection: 'users',
    depth: 0,
    limit: 1000,
    overrideAccess: false,
  })
  return docs.filter((u) => u.slug).map((u) => ({ slug: u.slug! }))
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const author = await getAuthorBySlug(slug)
  return { title: author ? author.name : 'Author' }
}

export default async function AuthorPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const author = await getAuthorBySlug(slug)
  if (!author) notFound()

  const posts = await getPostsByAuthor(author.id)
  const stats = coverageStats(posts)
  const avatar = mediaInfo(author.avatar)

  return (
    <div className="wrap">
      <div className="page-head" style={{ paddingBottom: 0 }}>
        <Breadcrumbs items={[{ label: 'Home', href: '/' }, { label: author.name }]} />
      </div>

      <div className="author-head">
        {avatar && (
          /* eslint-disable-next-line @next/next/no-img-element */
          <img className="avatar" src={avatar.url} alt={avatar.alt} />
        )}
        <div>
          <h1 className="page-head__title" style={{ fontSize: 'clamp(2rem, 5vw, 3rem)' }}>
            {author.name}
          </h1>
          {author.bio && <p className="author-head__bio">{author.bio}</p>}
        </div>
      </div>

      <Stats posts={stats.posts} countries={stats.countries} cities={stats.cities} />

      <PostList posts={posts} context="global" />
    </div>
  )
}
