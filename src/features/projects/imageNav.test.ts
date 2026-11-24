import { describe, expect, it } from 'vitest'
import { stepIndex } from './imageNav'

describe('stepIndex', () => {
  it('moves forward and back', () => {
    expect(stepIndex(1, 5, 1)).toBe(2)
    expect(stepIndex(3, 5, -1)).toBe(2)
  })

  it('wraps around at both ends', () => {
    expect(stepIndex(4, 5, 1)).toBe(0)
    expect(stepIndex(0, 5, -1)).toBe(4)
  })

  it('stays put when there is only one image', () => {
    expect(stepIndex(0, 1, 1)).toBe(0)
    expect(stepIndex(0, 1, -1)).toBe(0)
  })

  it('returns 0 when there are no images', () => {
    expect(stepIndex(0, 0, 1)).toBe(0)
    expect(stepIndex(3, 0, -1)).toBe(0)
  })
})