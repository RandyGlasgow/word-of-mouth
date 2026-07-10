'use client'

import { useEffect } from 'react'

/**
 * Fires one POST to the views API on mount to record a view. Invisible and
 * non-blocking: it renders nothing and ignores all errors so it can never
 * slow or break the page.
 */
export function ViewPing({ postId }: { postId: number | string }): null {
  useEffect(() => {
    void fetch(`/api/views/${postId}`, { method: 'POST' }).catch(() => {})
  }, [postId])
  return null
}
