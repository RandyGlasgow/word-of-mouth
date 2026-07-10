import Link from 'next/link'
import { notFound } from 'next/navigation'
import React from 'react'

import { Breadcrumbs } from '@/components/Breadcrumbs'
import { PostList } from '@/components/PostList'
import { Stats } from '@/components/Stats'
import { coverageStats, getPostsInYear, getYears, groupByCountry } from '@/lib/queries'

export const dynamicParams = true

export async function generateStaticParams() {
  const years = await getYears()
  return years.map((year) => ({ year: String(year) }))
}

export async function generateMetadata({ params }: { params: Promise<{ year: string }> }) {
  const { year } = await params
  return { title: `${year} — everywhere we went` }
}

export default async function YearPage({ params }: { params: Promise<{ year: string }> }) {
  const { year: yearParam } = await params
  if (!/^\d{4}$/.test(yearParam)) notFound()
  const year = Number(yearParam)

  const posts = await getPostsInYear(year)
  if (posts.length === 0) notFound()

  const stats = coverageStats(posts)
  const byCountry = groupByCountry(posts)

  return (
    <div className="wrap">
      <div className="page-head">
        <Breadcrumbs items={[{ label: 'Home', href: '/' }, { label: yearParam }]} />
        <p className="page-head__kicker">The year in travel</p>
        <h1 className="page-head__title">{year}</h1>
      </div>

      <Stats posts={stats.posts} countries={stats.countries} cities={stats.cities} />

      {byCountry.map(({ country, posts: countryPosts }) => (
        <section className="group" key={country.id}>
          <div className="group__head">
            <h2 className="group__title">
              <Link href={`/${year}/${country.slug}`}>{country.name}</Link>
            </h2>
            <span className="group__meta">
              {countryPosts.length === 1 ? '1 write-up' : `${countryPosts.length} write-ups`}
            </span>
          </div>
          <PostList posts={countryPosts} context="country" />
        </section>
      ))}
    </div>
  )
}
