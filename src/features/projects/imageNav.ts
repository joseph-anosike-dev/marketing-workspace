/** Moves to the next or previous image, wrapping around at either end. */
export function stepIndex(index: number, count: number, delta: 1 | -1): number {
  if (count <= 0) return 0
  return (((index + delta) % count) + count) % count
}