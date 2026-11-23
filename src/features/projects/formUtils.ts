import { normalizeTag } from '@/lib/tags'
import type { ItemKind } from '@/types'

/** Turns "Baby Sleep, #sleep training" into clean, unique tags. */
export function parseTags(text: string): string[] {
  const seen = new Set<string>()
  for (const part of text.split(',')) {
    const tag = normalizeTag(part)
    if (tag) seen.add(tag)
  }
  return [...seen]
}

export function tagsToText(tags: string[]): string {
  return tags.join(', ')
}

/** Adds the tag if it is missing, removes it if it is already there. */
export function toggleTagInText(text: string, tag: string): string {
  const tags = parseTags(text)
  return tagsToText(
    tags.includes(tag) ? tags.filter((t) => t !== tag) : [...tags, tag],
  )
}

/**
 * Adds https:// to things that look like a bare web address
 * ("example.com/page"). Anything with a colon, a space or no dot is left
 * alone, so the validation rules can reject it with a clear message.
 */
export function normalizeUrlInput(raw: string): string {
  const text = raw.trim()
  if (!text) return ''
  if (text.includes(':') || /\s/.test(text)) return text
  if (text.includes('.')) return `https://${text}`
  return text
}

/** A finding with a link is a "link"; images keep their kind. */
export function deriveKind(existing: ItemKind, sourceUrl: string): ItemKind {
  if (existing === 'image') return 'image'
  return sourceUrl ? 'link' : 'note'
}