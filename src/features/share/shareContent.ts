import { isAllowedImageType } from '@/lib/images'

/** What the share plugin hands us. Every part is optional because apps share very different things. */
export interface RawShareEvent {
  title?: string
  texts?: string[]
  files?: Array<{ uri?: string; name?: string; mimeType?: string }>
}

export interface SharedFileRef {
  uri: string
  name: string
  mimeType: string
}

/** A share, reduced to what the quick-save page needs. Plain data, so it can travel in router state. */
export interface IncomingShare {
  title: string
  sourceUrl: string
  body: string
  images: SharedFileRef[]
  /** Files that were shared but are not images this app can store. */
  skipped: number
}

const URL_PATTERN = /https?:\/\/[^\s<>"')\]]+/i
const TRAILING_PUNCTUATION = /[.,;:!?]+$/
const MAX_TITLE_LENGTH = 80

const TYPE_BY_EXTENSION: Record<string, string> = {
  png: 'image/png',
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  webp: 'image/webp',
  gif: 'image/gif',
}

/** Some apps send no type for a file; fall back to its extension. */
function guessMimeType(name: string, given: string): string {
  if (given) return given.toLowerCase()
  const extension = name.split('.').pop()?.toLowerCase() ?? ''
  return TYPE_BY_EXTENSION[extension] ?? ''
}

function firstLineAsTitle(text: string): string {
  const line = text.split(/\r?\n/).find((l) => l.trim()) ?? ''
  const clean = line.replace(/\s+/g, ' ').trim()
  if (clean.length <= MAX_TITLE_LENGTH) return clean
  const cut = clean.slice(0, MAX_TITLE_LENGTH)
  const lastSpace = cut.lastIndexOf(' ')
  return `${(lastSpace > 30 ? cut.slice(0, lastSpace) : cut).trim()}…`
}

/**
 * Turns whatever was shared into a draft finding:
 * the first web link becomes the source, the rest of the text becomes the
 * notes, and images are kept apart. Nothing is invented or decided for the person.
 */
export function interpretShare(event: RawShareEvent): IncomingShare {
  const texts = (event.texts ?? []).map((t) => t.trim()).filter(Boolean)
  const joined = texts.join('\n\n')

  let sourceUrl = ''
  let body = joined
  const match = URL_PATTERN.exec(joined)
  if (match) {
    sourceUrl = match[0].replace(TRAILING_PUNCTUATION, '')
    body = joined
      .replace(match[0], '')
      .replace(/[ \t]+\n/g, '\n')
      .replace(/\n{3,}/g, '\n\n')
      .trim()
  }

  const title = (event.title ?? '').replace(/\s+/g, ' ').trim() || firstLineAsTitle(body)

  const files = event.files ?? []
  const images: SharedFileRef[] = []
  for (const file of files) {
    const uri = file.uri ?? ''
    const name = file.name ?? ''
    const mimeType = guessMimeType(name, file.mimeType ?? '')
    if (uri && isAllowedImageType(mimeType)) images.push({ uri, name, mimeType })
  }

  return { title, sourceUrl, body, images, skipped: files.length - images.length }
}

/** True when the share carries nothing the page can use. */
export function isEmptyShare(share: IncomingShare): boolean {
  return !share.title && !share.sourceUrl && !share.body && share.images.length === 0
}

function pad(n: number): string {
  return String(n).padStart(2, '0')
}

/** A name for a finding saved without a title, so a quick save never stops on a blank field. */
export function fallbackTitle(hasImages: boolean, now: Date = new Date()): string {
  const stamp = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())} ${pad(now.getHours())}:${pad(now.getMinutes())}`
  return hasImages ? `Screenshot ${stamp}` : `Finding ${stamp}`
}
