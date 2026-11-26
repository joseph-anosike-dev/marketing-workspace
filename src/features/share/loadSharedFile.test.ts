import { describe, expect, it } from 'vitest'
import { dataUrlToBlob } from './loadSharedFile'

describe('dataUrlToBlob', () => {
  it('reads a base64 data address without fetching it', async () => {
    const blob = dataUrlToBlob('data:text/plain;base64,aGVsbG8=')
    expect(blob.type).toBe('text/plain')
    expect(await blob.text()).toBe('hello')
  })

  it('reads a plain-text data address', async () => {
    expect(await dataUrlToBlob('data:,a%20b').text()).toBe('a b')
  })

  it('rejects anything that is not a data address', () => {
    expect(() => dataUrlToBlob('https://example.com/a.png')).toThrow()
  })
})
