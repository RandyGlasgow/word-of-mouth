import config from '@payload-config'
import { NextResponse } from 'next/server'
import { getPayload } from 'payload'

/**
 * POST /api/views/:postId — record one unique-visitor view.
 *
 * A visitor is identified by an anonymous UUID in the `wom_uid` cookie. If the
 * cookie is missing we mint one (crypto.randomUUID) and set it on the response.
 * The write is idempotent: a unique (post, visitor) index makes a repeat view a
 * no-op, so we swallow the unique-violation error and return success either way.
 * The count is never written onto the post — it is derived by querying rows.
 */

const COOKIE_NAME = 'wom_uid'
const ONE_YEAR_SECONDS = 60 * 60 * 24 * 365

function readCookie(header: string | null, name: string): string | undefined {
  if (!header) return undefined
  for (const part of header.split(';')) {
    const eq = part.indexOf('=')
    if (eq === -1) continue
    if (part.slice(0, eq).trim() === name) {
      return decodeURIComponent(part.slice(eq + 1).trim())
    }
  }
  return undefined
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ postId: string }> },
): Promise<Response> {
  const { postId } = await params
  const id = Number(postId)
  if (!Number.isInteger(id) || id <= 0) {
    return NextResponse.json({ error: 'invalid post id' }, { status: 404 })
  }

  const payload = await getPayload({ config })

  // The post must exist (and we don't leak drafts vs. published — either counts).
  try {
    await payload.findByID({ collection: 'posts', id, depth: 0, overrideAccess: true })
  } catch {
    return NextResponse.json({ error: 'post not found' }, { status: 404 })
  }

  const existing = readCookie(request.headers.get('cookie'), COOKIE_NAME)
  const visitor = existing ?? crypto.randomUUID()

  try {
    await payload.create({
      collection: 'post-views',
      data: { post: id, visitor },
      overrideAccess: true,
    })
  } catch {
    // Unique-violation (repeat view) or benign write race — the count is
    // unaffected, so this is a success from the caller's perspective.
  }

  const res = new NextResponse(null, { status: 204 })
  if (!existing) {
    res.cookies.set(COOKIE_NAME, visitor, {
      httpOnly: true,
      sameSite: 'lax',
      path: '/',
      maxAge: ONE_YEAR_SECONDS,
    })
  }
  return res
}
