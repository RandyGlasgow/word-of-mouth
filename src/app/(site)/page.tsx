import Link from 'next/link'
import React from 'react'

import { PostList } from '@/components/PostList'
import { getRecentPosts, getYears } from '@/lib/queries'

export default async function HomePage() {
  const [recent, years] = await Promise.all([getRecentPosts(8), getYears()])

  return (
    <>
      <section className="hero wrap">
        <h1 className="hero__title">Word of Mouth</h1>
        <p className="hero__tagline">
          A travel journal built from tips — a bartender&rsquo;s aside, a friend&rsquo;s must-see
          list — kept where the trail of who suggested what stays visible.
        </p>
      </section>

      <div className="wrap">
        <section className="page-head" style={{ paddingBottom: '0.5rem' }}>
          <p className="page-head__kicker">Recent write-ups</p>
        </section>
        <PostList posts={recent} context="global" />

        {years.length > 0 && (
          <section className="browse">
            <h2 className="browse__title">Browse by year</h2>
            <div className="year-links">
              {years.map((year) => (
                <Link key={year} href={`/${year}`}>
                  {year}
                </Link>
              ))}
            </div>
          </section>
        )}
      </div>
    </>
  )
}
