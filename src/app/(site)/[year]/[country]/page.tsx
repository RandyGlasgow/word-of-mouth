import Link from 'next/link'
import { notFound } from 'next/navigation'
import React from 'react'

import { Breadcrumbs } from '@/components/Breadcrumbs'
import { Cover } from '@/components/Cover'
import { PostList } from '@/components/PostList'
import { Stats } from '@/components/Stats'
import {
  coverageStats,
  getAllPublishedPosts,
  getCountryBySlug,
  getPostsInYear,
  groupByCity,
  postYear,
} from '@/lib/queries'

export const dynamicParams = true

export async function generateStaticParams() {
  const posts = await getAllPublishedPosts()
  const seen = new Set<string>()
  const params: { year: string; country: string }[] = []
  for (const post of posts) {
    const key = `${postYear(post)}/${post.city.country.slug}`
    if (seen.has(key)) continue
    seen.add(key)
    params.push({ year: String(postYear(post)), country: post.city.country.slug! })
  }
  return params
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ year: string; country: string }>
}) {
  const { year, country } = await params
  const doc = await getCountryBySlug(country)
  return { title: `${doc?.name ?? country} in ${year}` }
}

export default async function CountryPage({
  params,
}: {
  params: Promise<{ year: string; country: string }>
}) {
  const { year: yearParam, country: countrySlug } = await params
  if (!/^\d{4}$/.test(yearParam)) notFound()
  const year = Number(yearParam)

  const country = await getCountryBySlug(countrySlug)
  if (!country) notFound()

  const posts = (await getPostsInYear(year)).filter(
    (p) => p.city.country.slug === countrySlug,
  )
  if (posts.length === 0) notFound()

  const stats = coverageStats(posts)
  const byCity = groupByCity(posts)

  return (
    <div className="wrap">
      <div className="page-head">
        <Breadcrumbs
          items={[
            { label: 'Home', href: '/' },
            { label: yearParam, href: `/${year}` },
            { label: country.name },
          ]}
        />
        <p className="page-head__kicker">{year}</p>
        <h1 className="page-head__title">{country.name}</h1>
        {country.intro && <p className="page-head__intro">{country.intro}</p>}
      </div>

      <Cover media={country.cover} />

      <Stats posts={stats.posts} cities={stats.cities} />

      {byCity.map(({ city, posts: cityPosts }) => (
        <section className="group" key={city.id}>
          <div className="group__head">
            <h2 className="group__title">
              <Link href={`/${year}/${countrySlug}/${city.slug}`}>{city.name}</Link>
            </h2>
            <span className="group__meta">
              {cityPosts.length === 1 ? '1 write-up' : `${cityPosts.length} write-ups`}
            </span>
          </div>
          <PostList posts={cityPosts} context="city" />
        </section>
      ))}
    </div>
  )
}
