import { afterEach, describe, expect, it, vi } from 'vitest'

import { isShortLink, parseMapsUrl, resolveShortLink } from '../../src/lib/mapsUrl'

describe('parseMapsUrl', () => {
  it('parses !3d/!4d data-segment coordinates (the place pin)', () => {
    const url =
      'https://www.google.com/maps/place/Time+Out+Market/@38.7067,-9.1459,17z/data=!3d38.7069!4d-9.1461'
    expect(parseMapsUrl(url)).toEqual({
      point: [-9.1461, 38.7069],
      placeName: 'Time Out Market',
    })
  })

  it('prefers !3d/!4d over the @ viewport center when both are present', () => {
    // @ carries the viewport center; !3d/!4d carries the actual pin.
    const url = 'https://www.google.com/maps/place/X/@38.7067,-9.1459,17z/data=!3d10.5!4d20.25'
    expect(parseMapsUrl(url)?.point).toEqual([20.25, 10.5])
  })

  it('parses ?q=lat,lng', () => {
    const url = 'https://www.google.com/maps?q=40.6892,-74.0445'
    expect(parseMapsUrl(url)).toEqual({ point: [-74.0445, 40.6892] })
  })

  it('parses ?query=lat,lng', () => {
    const url = 'https://www.google.com/maps/search/?api=1&query=51.5007,-0.1246'
    expect(parseMapsUrl(url)).toEqual({ point: [-0.1246, 51.5007] })
  })

  it('parses @lat,lng,zoom viewport coordinates', () => {
    const url = 'https://www.google.com/maps/@48.8584,2.2945,15z'
    expect(parseMapsUrl(url)).toEqual({ point: [2.2945, 48.8584] })
  })

  it('decodes a place name, turning + into spaces', () => {
    const url = 'https://www.google.com/maps/place/Caf%C3%A9+Central/@48.2,16.3,15z/data=!3d48.2!4d16.3'
    expect(parseMapsUrl(url)?.placeName).toBe('Café Central')
  })

  it('accepts maps.google.com subdomains', () => {
    expect(parseMapsUrl('https://maps.google.com/?q=1.29,103.85')?.point).toEqual([103.85, 1.29])
  })

  it('returns null for a non-Google URL', () => {
    expect(parseMapsUrl('https://example.com/maps?q=40,-74')).toBeNull()
  })

  it('rejects lookalike hosts where google is a subdomain of an attacker domain', () => {
    // `google` is not the registrable domain here — these are attacker-owned.
    expect(parseMapsUrl('https://google.evil.com/maps?q=40,-74')).toBeNull()
    expect(parseMapsUrl('https://google.com.evil.com/maps?q=40,-74')).toBeNull()
    expect(parseMapsUrl('https://evilgoogle.com/maps?q=40,-74')).toBeNull()
  })

  it('accepts localized ccTLD Google hosts', () => {
    expect(parseMapsUrl('https://maps.google.co.uk/?q=51.5,-0.12')?.point).toEqual([-0.12, 51.5])
    expect(parseMapsUrl('https://www.google.de/maps?q=52.52,13.405')?.point).toEqual([13.405, 52.52])
  })

  it('returns null for a Google URL with no coordinates', () => {
    expect(parseMapsUrl('https://www.google.com/maps/search/coffee')).toBeNull()
  })

  it('returns null for a q value that is a search term, not coordinates', () => {
    expect(parseMapsUrl('https://www.google.com/maps?q=best+tacos')).toBeNull()
  })

  it('returns null for a malformed URL string', () => {
    expect(parseMapsUrl('not a url')).toBeNull()
  })

  it('rejects out-of-range coordinates', () => {
    expect(parseMapsUrl('https://www.google.com/maps?q=200,999')).toBeNull()
  })
})

describe('isShortLink', () => {
  it('recognizes maps.app.goo.gl links', () => {
    expect(isShortLink('https://maps.app.goo.gl/abc123')).toBe(true)
  })

  it('recognizes goo.gl/maps links', () => {
    expect(isShortLink('https://goo.gl/maps/abc123')).toBe(true)
  })

  it('does not treat a full maps URL as a short link', () => {
    expect(isShortLink('https://www.google.com/maps/@1,2,3z')).toBe(false)
  })

  it('does not treat a non-maps goo.gl link as a maps short link', () => {
    expect(isShortLink('https://goo.gl/something')).toBe(false)
  })
})

describe('resolveShortLink', () => {
  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('reads the Location header from a manual-redirect fetch', async () => {
    const target = 'https://www.google.com/maps/place/X/@1,2,15z/data=!3d1!4d2'
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(null, { status: 302, headers: { location: target } }),
    )

    const resolved = await resolveShortLink('https://maps.app.goo.gl/abc123')

    expect(resolved).toBe(target)
    expect(fetchMock).toHaveBeenCalledWith('https://maps.app.goo.gl/abc123', {
      redirect: 'manual',
    })
    // The resolved URL parses like any full Maps link.
    expect(parseMapsUrl(resolved as string)?.point).toEqual([2, 1])
  })

  it('returns null when there is no redirect', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response(null, { status: 200 }))
    expect(await resolveShortLink('https://maps.app.goo.gl/abc123')).toBeNull()
  })
})
