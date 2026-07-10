import config from '@payload-config'
import { getPayload } from 'payload'

import type { City, Country, Person, Post, User } from '@/payload-types'

/**
 * Data-access helpers for the public site. Every read here is scoped to
 * published posts only and derives canonical URLs from relationships rather
 * than storing them (see the URL contract in the PRD).
 */

export const getClient = async () => getPayload({ config: await config })

/** A post with its city/country/author relationships populated (depth >= 2). */
export type PopulatedPost = Omit<Post, 'city' | 'author' | 'referredBy'> & {
  city: City & { country: Country }
  author: User
  referredBy?: Person | null
}

const publishedWhere = {
  _status: { equals: 'published' as const },
}

/** UTC year for a post's publish date — the `<year>` URL segment. */
export const postYear = (post: Pick<Post, 'publishedDate'>): number =>
  new Date(post.publishedDate).getUTCFullYear()

/** Canonical URL for a fully populated post. */
export const postHref = (post: PopulatedPost): string =>
  `/${postYear(post)}/${post.city.country.slug}/${post.city.slug}/${post.slug}`

export const authorHref = (author: Pick<User, 'slug'>): string => `/authors/${author.slug}`

const yearRange = (year: number) => ({
  and: [
    { publishedDate: { greater_than_equal: `${year}-01-01T00:00:00.000Z` } },
    { publishedDate: { less_than: `${year + 1}-01-01T00:00:00.000Z` } },
  ],
})

export const getRecentPosts = async (limit = 6): Promise<PopulatedPost[]> => {
  const payload = await getClient()
  const { docs } = await payload.find({
    collection: 'posts',
    where: publishedWhere,
    sort: '-publishedDate',
    depth: 2,
    limit,
    overrideAccess: false,
  })
  return docs as unknown as PopulatedPost[]
}

/** All published posts, used to derive the list of years covered. */
export const getAllPublishedPosts = async (): Promise<PopulatedPost[]> => {
  const payload = await getClient()
  const { docs } = await payload.find({
    collection: 'posts',
    where: publishedWhere,
    sort: '-publishedDate',
    depth: 2,
    limit: 1000,
    overrideAccess: false,
  })
  return docs as unknown as PopulatedPost[]
}

export const getYears = async (): Promise<number[]> => {
  const posts = await getAllPublishedPosts()
  return [...new Set(posts.map(postYear))].sort((a, b) => b - a)
}

export const getPostsInYear = async (year: number): Promise<PopulatedPost[]> => {
  const payload = await getClient()
  const { docs } = await payload.find({
    collection: 'posts',
    where: { and: [publishedWhere, yearRange(year)] },
    sort: '-publishedDate',
    depth: 2,
    limit: 1000,
    overrideAccess: false,
  })
  return docs as unknown as PopulatedPost[]
}

export const getCountryBySlug = async (slug: string): Promise<Country | null> => {
  const payload = await getClient()
  const { docs } = await payload.find({
    collection: 'countries',
    where: { slug: { equals: slug } },
    depth: 1,
    limit: 1,
    overrideAccess: false,
  })
  return (docs[0] as Country) ?? null
}

export const getCityBySlug = async (slug: string): Promise<(City & { country: Country }) | null> => {
  const payload = await getClient()
  const { docs } = await payload.find({
    collection: 'cities',
    where: { slug: { equals: slug } },
    depth: 1,
    limit: 1,
    overrideAccess: false,
  })
  return (docs[0] as unknown as City & { country: Country }) ?? null
}

export const getAuthorBySlug = async (slug: string): Promise<User | null> => {
  const payload = await getClient()
  const { docs } = await payload.find({
    collection: 'users',
    where: { slug: { equals: slug } },
    depth: 1,
    limit: 1,
    overrideAccess: false,
  })
  return (docs[0] as User) ?? null
}

export const getPostsByAuthor = async (authorId: number): Promise<PopulatedPost[]> => {
  const payload = await getClient()
  const { docs } = await payload.find({
    collection: 'posts',
    where: { and: [publishedWhere, { author: { equals: authorId } }] },
    sort: '-publishedDate',
    depth: 2,
    limit: 1000,
    overrideAccess: false,
  })
  return docs as unknown as PopulatedPost[]
}

/**
 * Resolve a single published post by its full hierarchical path. Returns null
 * when no published post matches, or when the post's derived path doesn't line
 * up with the requested year/country/city segments.
 */
export const getPostByPath = async (
  year: number,
  countrySlug: string,
  citySlug: string,
  slug: string,
): Promise<PopulatedPost | null> => {
  const payload = await getClient()
  const { docs } = await payload.find({
    collection: 'posts',
    where: { and: [publishedWhere, { slug: { equals: slug } }] },
    depth: 2,
    limit: 10,
    overrideAccess: false,
  })
  const posts = docs as unknown as PopulatedPost[]
  return (
    posts.find(
      (p) =>
        postYear(p) === year &&
        p.city?.slug === citySlug &&
        p.city?.country?.slug === countrySlug,
    ) ?? null
  )
}

/** Other published posts from the same city (for the "more from this city" rail). */
export const getMoreFromCity = async (
  cityId: number,
  excludePostId: number,
  limit = 4,
): Promise<PopulatedPost[]> => {
  const payload = await getClient()
  const { docs } = await payload.find({
    collection: 'posts',
    where: {
      and: [
        publishedWhere,
        { city: { equals: cityId } },
        { id: { not_equals: excludePostId } },
      ],
    },
    sort: '-publishedDate',
    depth: 2,
    limit,
    overrideAccess: false,
  })
  return docs as unknown as PopulatedPost[]
}

/** Group populated posts by country slug, preserving first-seen order. */
export const groupByCountry = (
  posts: PopulatedPost[],
): { country: Country; posts: PopulatedPost[] }[] => {
  const groups = new Map<string, { country: Country; posts: PopulatedPost[] }>()
  for (const post of posts) {
    const key = post.city.country.slug ?? String(post.city.country.id)
    if (!groups.has(key)) groups.set(key, { country: post.city.country, posts: [] })
    groups.get(key)!.posts.push(post)
  }
  return [...groups.values()]
}

/** Group populated posts by city slug, preserving first-seen order. */
export const groupByCity = (
  posts: PopulatedPost[],
): { city: City & { country: Country }; posts: PopulatedPost[] }[] => {
  const groups = new Map<string, { city: City & { country: Country }; posts: PopulatedPost[] }>()
  for (const post of posts) {
    const key = post.city.slug ?? String(post.city.id)
    if (!groups.has(key)) groups.set(key, { city: post.city, posts: [] })
    groups.get(key)!.posts.push(post)
  }
  return [...groups.values()]
}

/** Count of distinct countries / cities across a set of posts. */
export const coverageStats = (posts: PopulatedPost[]) => ({
  posts: posts.length,
  countries: new Set(posts.map((p) => p.city.country.slug)).size,
  cities: new Set(posts.map((p) => p.city.slug)).size,
})
