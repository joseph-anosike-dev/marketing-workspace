/** True for the invisible control characters (codes 0 to 31 and 127) that have no place in names or paths. */
function isControl(char: string): boolean {
  const code = char.codePointAt(0) ?? 0
  return code <= 0x1f || code === 0x7f
}

export function hasControlChars(text: string): boolean {
  return [...text].some(isControl)
}

export function stripControlChars(text: string): string {
  return [...text].filter((char) => !isControl(char)).join('')
}
