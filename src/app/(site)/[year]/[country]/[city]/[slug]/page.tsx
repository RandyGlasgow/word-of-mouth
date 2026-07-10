import { RichText } from '@payloadcms/richtext-lexical/react'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import React from 'react'

import { Breadcrumbs } from '@/components/Breadcrumbs'
import { Cover } from '@/components/Cover'
import { formatDate } from '@/components/format'
import { mediaInfo } from '@/components/media'
import { Rail } from '@/components/Rail'
import {
  authorHref,
  getAllPublishedPosts,
  getMoreFromCity,
  getPostByPath,
  postYear,
} from '@/lib/queries'
import type { Media } from '@/payload-types'
import { ViewPing } from '@/views'

export const dynamicParams = true

export async function generateStaticParams() {
  const posts = await getAllPublishedPosts()
  return posts.map((post) => ({
    year: String(postYear(post)),
    country: post.city.country.slug!,
    city: post.city.slug!,
    slug: post.slug!,
  }))
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ year: string; country: string; city: string; slug: string }>
}) {
  const { year, country, city, slug } = await params
  const post = await getPostByPath(Number(year), country, city, slug)
  if (!post) return {}
  return { title: post.title, description: post.excerpt ?? undefined }
}

export default async function PostPage({
  params,
}: {
  params: Promise<{ year: string; country: string; city: string; slug: string }>
}) {
  const { year: yearParam, country: countrySlug, city: citySlug, slug } = await params
  if (!/^\d{4}$/.test(yearParam)) notFound()

  const post = await getPostByPath(Number(yearParam), countrySlug, citySlug, slug)
  if (!post) notFound()

  const moreFromCity = await getMoreFromCity(post.city.id, post.id)
  const gallery = (post.gallery ?? [])
    .map((m) => mediaInfo(m as number | Media))
    .filter((m): m is NonNullable<typeof m> => m !== null)

  return (
    <div className="wrap">
      <div className="page-head" style={{ paddingBottom: 0 }}>
        <Breadcrumbs
          items={[
            { label: 'Home', href: '/' },
            { label: yearParam, href: `/${yearParam}` },
            { label: post.city.country.name, href: `/${yearParam}/${countrySlug}` },
            { label: post.city.name, href: `/${yearParam}/${countrySlug}/${citySlug}` },
            { label: post.title },
          ]}
        />
      </div>

      <div className="post-layout">
        <article className="article">
          <h1 className="article__title">{post.title}</h1>
          <p className="article__byline">
            by{' '}
            <Link href={authorHref(post.author)} className="who">
              {post.author.name}
            </Link>
            {post.referredBy && <> · suggested by {post.referredBy.name}</>}
          </p>
          <p className="article__date">{formatDate(post.publishedDate)}</p>

          <Cover media={post.cover} />

          <div className="article__body">
            <RichText data={post.body} />
          </div>

          {gallery.length > 0 && (
            <div className="gallery">
              {gallery.map((img, i) => (
                /* eslint-disable-next-line @next/next/no-img-element */
                <img key={i} src={img.url} alt={img.alt} />
              ))}
            </div>
          )}
        </article>

        <Rail post={post} moreFromCity={moreFromCity} />
      </div>

      <ViewPing postId={post.id} />
    </div>
  )
}
