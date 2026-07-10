import React from 'react'

/** Summary stats line for aggregation pages — post count and places covered. */
export function Stats({
  posts,
  countries,
  cities,
}: {
  posts: number
  countries?: number
  cities?: number
}) {
  return (
    <div className="stats">
      <div className="stats__item">
        <span className="stats__value">{posts}</span>
        <span className="stats__label">{posts === 1 ? 'write-up' : 'write-ups'}</span>
      </div>
      {countries !== undefined && (
        <div className="stats__item">
          <span className="stats__value">{countries}</span>
          <span className="stats__label">{countries === 1 ? 'country' : 'countries'}</span>
        </div>
      )}
      {cities !== undefined && (
        <div className="stats__item">
          <span className="stats__value">{cities}</span>
          <span className="stats__label">{cities === 1 ? 'city' : 'cities'}</span>
        </div>
      )}
    </div>
  )
}
