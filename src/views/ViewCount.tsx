import config from '@payload-config'
import { getPayload } from 'payload'

/**
 * Server component that renders a post's unique-visitor count. The count is a
 * live aggregate query against the post-views table — never read from the post
 * record — so it stays cheap and cacheable with the page's revalidation window.
 * Markup is intentionally minimal; the site seam styles `.view-count`.
 */
export async function ViewCount({ postId }: { postId: number | string }): Promise<React.ReactElement> {
  const payload = await getPayload({ config })
  const { totalDocs } = await payload.count({
    collection: 'post-views',
    where: { post: { equals: Number(postId) } },
    overrideAccess: true,
  })
  return (
    <span className="view-count">
      {totalDocs} {totalDocs === 1 ? 'view' : 'views'}
    </span>
  )
}
