import { describe, expect, it } from 'vitest'
import { hasControlChars, stripControlChars } from './controlChars'

describe('control characters', () => {
  it('finds them, including tab, newline, null and delete', () => {
    for (const bad of ['a\u0000b', 'a\tb', 'a\nb', 'a\u001fb', 'a\u007fb']) {
      expect(hasControlChars(bad), JSON.stringify(bad)).toBe(true)
    }
  })

  it('leaves ordinary text alone, including spaces, accents and emoji', () => {
    for (const fine of ['', 'plain name.png', 'café ☕ 日本語', 'a b']) {
      expect(hasControlChars(fine)).toBe(false)
      expect(stripControlChars(fine)).toBe(fine)
    }
  })

  it('removes them and keeps the rest in order', () => {
    expect(stripControlChars('re\u0000po\trt\u007f.png')).toBe('report.png')
  })
})
