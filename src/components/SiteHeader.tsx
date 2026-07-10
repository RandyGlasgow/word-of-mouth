import Link from 'next/link'
import React from 'react'

export function SiteHeader() {
  return (
    <header className="site-header">
      <div className="wrap site-header__inner">
        <Link href="/" className="site-header__brand">
          Word of Mouth
        </Link>
        <span className="site-header__tagline">Travel, by way of suggestion</span>
      </div>
    </header>
  )
}
