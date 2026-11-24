import { describe, expect, it } from 'vitest'
import { crc32 } from './crc32'

const bytes = (text: string) => new TextEncoder().encode(text)

describe('crc32', () => {
  it('matches the standard check value for "123456789"', () => {
    expect(crc32(bytes('123456789'))).toBe(0xcbf43926)
  })

  it('is 0 for no data', () => {
    expect(crc32(new Uint8Array(0))).toBe(0)
  })

  it('matches known values', () => {
    expect(crc32(bytes('a'))).toBe(0xe8b7be43)
    expect(crc32(bytes('The quick brown fox jumps over the lazy dog'))).toBe(0x414fa339)
  })

  it('always returns an unsigned number', () => {
    const value = crc32(new Uint8Array([255, 255, 255, 255]))
    expect(value).toBeGreaterThan(-1)
  })
})