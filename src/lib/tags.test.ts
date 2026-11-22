import { describe, expect, it } from 'vitest'
import { normalizeTag } from './tags'

describe('normalizeTag', () => {
  it.each([
    ['Baby Sleep', 'baby-sleep'],
    ['#Sleep Training', 'sleep-training'],
    ['  ##x ', 'x'],
    ['a   b', 'a-b'],
    ['a--b', 'a-b'],
    ['Parenting/Newborn', 'parenting/newborn'],
    ['-/x/-', 'x'],
    ['Café', 'café'],
    ['2024', 'tag-2024'],
    ['#2024', 'tag-2024'],
    ['!!!', ''],
    ['', ''],
  ])('turns %j into %j', (input, expected) => {
    expect(normalizeTag(input)).toBe(expected)
  })
})