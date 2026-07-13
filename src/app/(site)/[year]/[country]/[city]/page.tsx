import { notFound } from 'next/navigation'
import React from 'react'

import { Breadcrumbs } from '@/components/Breadcrumbs'
import { Cover } from '@/components/Cover'
import { PostList } from '@/components/PostList'
import { Stats } from '@/components/Stats'
import {
  getAllPublishedPosts,
  getCityBySlug,
  getPostsInYear,
  postYear,
} from '@/lib/queries'

export const dynamicParams = true

export async function generateStaticParams() {
  const posts = await getAllPublishedPosts()
  const seen = new Set<string>()
  const params: { year: string; country: string; city: string }[] = []
  for (const post of posts) {
    const key = `${postYear(post)}/${post.place.city.country.slug}/${post.place.city.slug}`
    if (seen.has(key)) continue
    seen.add(key)
    params.push({
      year: String(postYear(post)),
      country: post.place.city.country.slug!,
      city: post.place.city.slug!,
    })
  }
  return params
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ year: string; country: string; city: string }>
}) {
  const { year, city } = await params
  const doc = await getCityBySlug(city)
  return { title: `${doc?.name ?? city} in ${year}` }
}

export default async function CityPage({
  params,
}: {
  params: Promise<{ year: string; country: string; city: string }>
}) {
  const { year: yearParam, country: countrySlug, city: citySlug } = await params
  if (!/^\d{4}$/.test(yearParam)) notFound()
  const year = Number(yearParam)

  const city = await getCityBySlug(citySlug)
  if (!city || city.country.slug !== countrySlug) notFound()

  const posts = (await getPostsInYear(year)).filter((p) => p.place.city.slug === citySlug)
  if (posts.length === 0) notFound()

  return (
    <div className="wrap">
      <div className="page-head">
        <Breadcrumbs
          items={[
            { label: 'Home', href: '/' },
            { label: yearParam, href: `/${year}` },
            { label: city.country.name, href: `/${year}/${countrySlug}` },
            { label: city.name },
          ]}
        />
        <p className="page-head__kicker">
          {city.country.name} · {year}
        </p>
        <h1 className="page-head__title">{city.name}</h1>
        {city.intro && <p className="page-head__intro">{city.intro}</p>}
      </div>

      <Cover media={city.cover} />

      <Stats posts={posts.length} />

      <PostList posts={posts} context="city" />
    </div>
  )
}
