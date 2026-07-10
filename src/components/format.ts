/** Human date like "12 June 2025", rendered in UTC so it matches the URL year. */
export const formatDate = (iso: string): string =>
  new Date(iso).toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    timeZone: 'UTC',
  })

export const pluralize = (n: number, word: string): string =>
  `${n} ${word}${n === 1 ? '' : 's'}`
