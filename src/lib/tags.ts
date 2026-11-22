/**
 * Turns user input into an Obsidian-safe tag:
 * lowercase, no leading #, spaces become hyphens, only letters,
 * numbers, "_", "-" and "/" are kept. Returns "" if nothing is left.
 */
export function normalizeTag(raw: string): string {
  const cleaned = raw
    .trim()
    .replace(/^#+/, '')
    .toLowerCase()
    .replace(/\s+/g, '-')
    .replace(/[^\p{L}\p{N}_\-/]/gu, '')
    .replace(/-+/g, '-')
    .replace(/^[-/]+|[-/]+$/g, '')

  // Obsidian ignores all-number tags such as #2024, so give them a prefix.
  if (cleaned && /^\d+$/.test(cleaned)) return `tag-${cleaned}`
  return cleaned
}