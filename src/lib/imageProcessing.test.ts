import { describe, expect, it } from 'vitest'
import { KEEP_BELOW_BYTES, friendlyFileName, planImage } from './imageProcessing'

describe('planImage', () => {
  it('keeps a small picture that already fits', () => {
    expect(
      planImage({ type: 'image/png', size: 50_000, width: 800, height: 600 }),
    ).toEqual({ action: 'keep', width: 800, height: 600 })
  })

  it('keeps a picture exactly at the size threshold', () => {
    expect(
      planImage({
        type: 'image/jpeg',
        size: KEEP_BELOW_BYTES,
        width: 1000,
        height: 1000,
      }).action,
    ).toBe('keep')
  })

  it('re-encodes a large file even when its dimensions are fine', () => {
    expect(
      planImage({
        type: 'image/jpeg',
        size: KEEP_BELOW_BYTES + 1,
        width: 1200,
        height: 900,
      }),
    ).toEqual({ action: 're-encode'.replace('-', ''), width: 1200, height: 900 })
  })

  it('shrinks a picture that is too wide, even when the file is small', () => {
    expect(
      planImage({ type: 'image/png', size: 10_000, width: 3200, height: 1600 }),
    ).toEqual({ action: 'reencode', width: 1600, height: 800 })
  })

  it('shrinks a picture that is too tall', () => {
    expect(
      planImage({ type: 'image/webp', size: 10_000, width: 1000, height: 4000 }),
    ).toEqual({ action: 'reencode', width: 400, height: 1600 })
  })

  it('never touches a GIF, however large', () => {
    expect(
      planImage({ type: 'image/gif', size: 4_000_000, width: 5000, height: 5000 }),
    ).toEqual({ action: 'keep', width: 5000, height: 5000 })
  })
})

describe('friendlyFileName', () => {
  const now = new Date('2026-11-24T13:05:09Z')

  it('dates the generic name browsers give pasted images', () => {
    expect(friendlyFileName('image.png', now)).toBe('screenshot-20261124-130509.png')
    expect(friendlyFileName('Image.JPEG', now)).toBe('screenshot-20261124-130509.jpeg')
    expect(friendlyFileName('C:\\temp\\image.webp', now)).toBe(
      'screenshot-20261124-130509.webp',
    )
  })

  it('leaves real names alone', () => {
    expect(friendlyFileName('pricing-page.png', now)).toBe('pricing-page.png')
    expect(friendlyFileName('my image.png', now)).toBe('my image.png')
  })

  it('still cleans odd names', () => {
    expect(friendlyFileName('', now)).toBe('image')
    expect(friendlyFileName('../../shot.png', now)).toBe('shot.png')
  })
})