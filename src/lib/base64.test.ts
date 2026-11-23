import { describe, expect, it } from 'vitest'
import {
  base64ToBlob,
  blobToBase64,
  decodedByteLength,
  isValidBase64,
} from './base64'

async function bytesOf(blob: Blob): Promise<number[]> {
  return Array.from(new Uint8Array(await blob.arrayBuffer()))
}

describe('blobToBase64 and base64ToBlob', () => {
  it('round-trips every possible byte value', async () => {
    const original = Uint8Array.from({ length: 256 }, (_, i) => i)
    const text = await blobToBase64(new Blob([original]))
    const back = base64ToBlob(text, 'image/png')
    expect(await bytesOf(back)).toEqual(Array.from(original))
    expect(back.type).toBe('image/png')
  })

  it('handles data larger than one encoding chunk', async () => {
    const original = Uint8Array.from({ length: 100_000 }, (_, i) => i % 251)
    const text = await blobToBase64(new Blob([original]))
    expect(decodedByteLength(text)).toBe(100_000)
    const back = base64ToBlob(text, 'image/webp')
    expect(back.size).toBe(100_000)
    expect(await bytesOf(back)).toEqual(Array.from(original))
  })
})

describe('isValidBase64', () => {
  it.each(['AQID', 'AQI=', 'AQ==', ''])('accepts %j', (value) => {
    expect(isValidBase64(value)).toBe(true)
  })

  it.each(['AQI', 'AQ!D', 'AQ=D', 'AQID=', 'data:image/png;base64,AQID'])(
    'rejects %j',
    (value) => {
      expect(isValidBase64(value)).toBe(false)
    },
  )
})

describe('decodedByteLength', () => {
  it.each([
    ['', 0],
    ['AQID', 3],
    ['AQI=', 2],
    ['AQ==', 1],
  ])('measures %j as %d bytes', (value, expected) => {
    expect(decodedByteLength(value)).toBe(expected)
  })
})