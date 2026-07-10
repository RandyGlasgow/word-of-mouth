import type {
  CollectionAfterChangeHook,
  CollectionAfterDeleteHook,
  PayloadRequest,
} from 'payload'

import { revalidatePath } from 'next/cache'

/**
 * Publishing is self-serve: statically generated pages must refresh without a
 * redeploy. These hooks revalidate a post's page and every aggregation page
 * above it in the hierarchy. Everything is wrapped so a revalidation failure
 * can never break a save, and seeding can opt out via `context.skipRevalidate`.
 */

// URL year is derived in UTC so it never shifts with the server's timezone
// (e.g. a midnight-UTC Jan 1 must not land in the previous year).
const yearOf = (date: string | Date): number => new Date(date).getUTCFullYear()

/**
 * Call revalidatePath, but treat "no request context" as a no-op. Local API
 * writes (seed scripts, CLI, tests) run outside Next's request scope, where
 * revalidatePath throws an "static generation store missing" invariant — that
 * is expected there and must stay silent. Genuine failures still propagate.
 */
const safeRevalidate = (path: string): void => {
  try {
    revalidatePath(path)
  } catch (err) {
    if (err instanceof Error && err.message.includes('static generation store')) return
    throw err
  }
}

const relId = (value: unknown): number | undefined => {
  if (value == null) return undefined
  if (typeof value === 'object') return (value as { id?: number }).id
  return value as number
}

/** Revalidate a post's page plus its city, country, year, home and author pages. */
const revalidatePostTree = async (post: Record<string, unknown>, req: PayloadRequest): Promise<void> => {
  const { payload } = req

  const cityId = relId(post.city)
  const authorId = relId(post.author)
  if (cityId == null || authorId == null || post.publishedDate == null) return

  const city = await payload.findByID({ collection: 'cities', id: cityId, depth: 0, req })
  const countryId = relId(city.country)
  const country =
    countryId == null
      ? undefined
      : await payload.findByID({ collection: 'countries', id: countryId, depth: 0, req })
  const author = await payload.findByID({ collection: 'users', id: authorId, depth: 0, req })

  const year = yearOf(post.publishedDate as string)
  const countrySlug = country?.slug
  const citySlug = city.slug

  const paths = new Set<string>(['/', `/${year}`, `/authors/${author.slug}`])
  if (countrySlug) {
    paths.add(`/${year}/${countrySlug}`)
    if (citySlug) {
      paths.add(`/${year}/${countrySlug}/${citySlug}`)
      paths.add(`/${year}/${countrySlug}/${citySlug}/${post.slug}`)
    }
  }
  for (const path of paths) safeRevalidate(path)
}

export const revalidatePost: CollectionAfterChangeHook = async ({ doc, req, context }) => {
  if (context?.skipRevalidate) return doc
  try {
    await revalidatePostTree(doc as Record<string, unknown>, req)
  } catch (err) {
    req.payload.logger.error({ err, msg: 'revalidatePost failed' })
  }
  return doc
}

export const revalidatePostDelete: CollectionAfterDeleteHook = async ({ doc, req, context }) => {
  if (context?.skipRevalidate) return doc
  try {
    await revalidatePostTree(doc as Record<string, unknown>, req)
  } catch (err) {
    req.payload.logger.error({ err, msg: 'revalidatePostDelete failed' })
  }
  return doc
}

/**
 * A city's intro blurb renders on its city pages. Editing it should refresh
 * only the year/country/city pages that actually carry published posts there,
 * plus the home page.
 */
export const revalidateCity: CollectionAfterChangeHook = async ({ doc, req, context }) => {
  if (context?.skipRevalidate) return doc
  try {
    const { payload } = req
    const countryId = relId(doc.country)
    const country =
      countryId == null
        ? undefined
        : await payload.findByID({ collection: 'countries', id: countryId, depth: 0, req })

    const posts = await payload.find({
      collection: 'posts',
      where: { and: [{ city: { equals: doc.id } }, { _status: { equals: 'published' } }] },
      depth: 0,
      limit: 1000,
      pagination: false,
      req,
    })

    const paths = new Set<string>(['/'])
    if (country?.slug) {
      for (const post of posts.docs) {
        paths.add(`/${yearOf(post.publishedDate)}/${country.slug}/${doc.slug}`)
      }
    }
    for (const path of paths) safeRevalidate(path)
  } catch (err) {
    req.payload.logger.error({ err, msg: 'revalidateCity failed' })
  }
  return doc
}

/**
 * A country's intro renders on its country pages. Refresh the year/country
 * pages that carry published posts in any of the country's cities, plus home.
 */
export const revalidateCountry: CollectionAfterChangeHook = async ({ doc, req, context }) => {
  if (context?.skipRevalidate) return doc
  try {
    const { payload } = req
    const cities = await payload.find({
      collection: 'cities',
      where: { country: { equals: doc.id } },
      depth: 0,
      limit: 1000,
      pagination: false,
      req,
    })
    const cityIds = cities.docs.map((c) => c.id)

    const paths = new Set<string>(['/'])
    if (cityIds.length > 0) {
      const posts = await payload.find({
        collection: 'posts',
        where: { and: [{ city: { in: cityIds } }, { _status: { equals: 'published' } }] },
        depth: 0,
        limit: 1000,
        pagination: false,
        req,
      })
      for (const post of posts.docs) {
        paths.add(`/${yearOf(post.publishedDate)}/${doc.slug}`)
      }
    }
    for (const path of paths) safeRevalidate(path)
  } catch (err) {
    req.payload.logger.error({ err, msg: 'revalidateCountry failed' })
  }
  return doc
}
