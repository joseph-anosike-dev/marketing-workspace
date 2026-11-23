import { describe, expect, it } from 'vitest'
import {
  cleanFileName,
  fitWithin,
  formatBytes,
  isAllowedImageType,
  withExtension,
} from './images'

describe('isAllowedImageType', () => {
  it.each(['image/png', 'image/jpeg', 'image/webp', 'image/gif'])(
    'allows %s',
    (type) => expect(isAllowedImageType(type)).toBe(true),
  )

  it.each(['image/svg+xml', 'text/html', 'application/pdf', ''])(
    'rejects %j',
    (type) => expect(isAllowedImageType(type)).toBe(false),
  )
})

describe('fitWithin', () => {
  it('never makes an image bigger', () => {
    expect(fitWithin(800, 600)).toEqual({ width: 800, height: 600 })
    expect(fitWithin(1600, 1600)).toEqual({ width: 1600, height: 1600 })
  })

  it('scales a wide image so the width fits', () => {
    expect(fitWithin(3200, 1600)).toEqual({ width: 1600, height: 800 })
  })

  it('scales a tall image so the height fits', () => {
    expect(fitWithin(1000, 4000)).toEqual({ width: 400, height: 1600 })
  })

  it('never produces a side smaller than 1 pixel', () => {
    expect(fitWithin(10000, 1)).toEqual({ width: 1600, height: 1 })
  })

  it('accepts a custom limit', () => {
    expect(fitWithin(400, 200, 100)).toEqual({ width: 100, height: 50 })
  })
})

describe('cleanFileName', () => {
  it('keeps a normal name', () => {
    expect(cleanFileName('shot.png')).toBe('shot.png')
  })

  it('removes folders', () => {
    expect(cleanFileName('C:\\fakepath\\shot.png')).toBe('shot.png')
    expect(cleanFileName('../../etc/passwd')).toBe('passwd')
  })

  it('removes control characters', () => {
    expect(cleanFileName('a\u0000b\u001fc.png')).toBe('abc.png')
  })

  it('falls back to "image" for empty names', () => {
    expect(cleanFileName('')).toBe('image')
    expect(cleanFileName('   ')).toBe('image')
    expect(cleanFileName('folder/')).toBe('image')
  })

  it('shortens long names but keeps the extension', () => {
    const result = cleanFileName(`${'a'.repeat(300)}.png`)
    expect(result).toHaveLength(120)
    expect(result.endsWith('.png')).toBe(true)
  })
})

describe('withExtension', () => {
  it('swaps the extension', () => {
    expect(withExtension('shot.png', 'image/webp')).toBe('shot.webp')
    expect(withExtension('my.file.name.jpeg', 'image/webp')).toBe('my.file.name.webp')
  })

  it('adds an extension when there is none', () => {
    expect(withExtension('photo', 'image/png')).toBe('photo.png')
  })

  it('handles a name that is only an extension', () => {
    expect(withExtension('.png', 'image/webp')).toBe('image.webp')
  })
})

describe('formatBytes', () => {
  it.each([
    [0, '0 B'],
    [512, '512 B'],
    [1536, '1.5 KB'],
    [20480, '20 KB'],
    [5 * 1024 * 1024, '5.0 MB'],
  ])('formats %d as %j', (bytes, expected) => {
    expect(formatBytes(bytes)).toBe(expected)
  })
})