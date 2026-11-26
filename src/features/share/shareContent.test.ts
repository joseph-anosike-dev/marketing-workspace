import { describe, expect, it } from 'vitest'
import { fallbackTitle, interpretShare, isEmptyShare } from './shareContent'

describe('interpretShare', () => {
  it('turns a shared link into the source and leaves the notes empty', () => {
    const share = interpretShare({ texts: ['https://example.com/page'] })
    expect(share.sourceUrl).toBe('https://example.com/page')
    expect(share.body).toBe('')
  })

  it('splits text that has a link in it, and drops trailing punctuation from the link', () => {
    const share = interpretShare({
      texts: ['Great pricing page, see https://example.com/pricing.'],
    })
    expect(share.sourceUrl).toBe('https://example.com/pricing')
    expect(share.body).toBe('Great pricing page, see')
  })

  it('uses the shared title, or else the first line of the text', () => {
    expect(interpretShare({ title: 'Acme pricing', texts: ['x'] }).title).toBe('Acme pricing')
    expect(interpretShare({ texts: ['First line\nsecond line'] }).title).toBe('First line')
  })

  it('shortens a very long first line without cutting a word in half', () => {
    const title = interpretShare({ texts: ['word '.repeat(60)] }).title
    expect(title.length).toBeLessThanOrEqual(81)
    expect(title.endsWith('…')).toBe(true)
  })

  it('keeps supported images and counts the rest as skipped', () => {
    const share = interpretShare({
      files: [
        { uri: 'file:///a.png', name: 'a.png', mimeType: 'image/png' },
        { uri: 'file:///b.pdf', name: 'b.pdf', mimeType: 'application/pdf' },
        { uri: 'file:///c.heic', name: 'c.heic', mimeType: 'image/heic' },
      ],
    })
    expect(share.images).toHaveLength(1)
    expect(share.skipped).toBe(2)
  })

  it('works out the type from the file name when the app sends none', () => {
    const share = interpretShare({ files: [{ uri: 'file:///shot.JPG', name: 'shot.JPG' }] })
    expect(share.images[0].mimeType).toBe('image/jpeg')
  })

  it('copes with an empty or odd event', () => {
    expect(isEmptyShare(interpretShare({}))).toBe(true)
    expect(isEmptyShare(interpretShare({ texts: ['  '], files: [] }))).toBe(true)
    expect(interpretShare({ files: [{ name: 'no-uri.png', mimeType: 'image/png' }] }).images).toEqual([])
  })
})

describe('fallbackTitle', () => {
  const when = new Date(2026, 10, 26, 9, 5)
  it('names a screenshot or a note by date and time', () => {
    expect(fallbackTitle(true, when)).toBe('Screenshot 2026-11-26 09:05')
    expect(fallbackTitle(false, when)).toBe('Finding 2026-11-26 09:05')
  })
})
