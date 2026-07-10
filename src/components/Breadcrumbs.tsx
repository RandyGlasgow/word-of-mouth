import Link from 'next/link'
import React from 'react'

export type Crumb = { label: string; href?: string }

/** Ancestor navigation shown on every level (home › year › country › city › post).
 *  The final crumb is the current page and is rendered without a link. */
export function Breadcrumbs({ items }: { items: Crumb[] }) {
  return (
    <nav className="breadcrumbs" aria-label="Breadcrumb">
      {items.map((item, i) => (
        <React.Fragment key={i}>
          {i > 0 && (
            <span className="breadcrumbs__sep" aria-hidden="true">
              ›
            </span>
          )}
          {item.href ? (
            <Link href={item.href}>{item.label}</Link>
          ) : (
            <span className="breadcrumbs__current" aria-current="page">
              {item.label}
            </span>
          )}
        </React.Fragment>
      ))}
    </nav>
  )
}
