import { stripControlChars } from './controlChars'
export const ALLOWED_IMAGE_TYPES = [
  'image/png',
  'image/jpeg',
  'image/webp',
  'image/gif',
] as const
export type AllowedImageType = (typeof ALLOWED_IMAGE_TYPES)[number]

/** The largest file a person can pick. */
export const MAX_INPUT_BYTES = 10 * 1024 * 1024
/** The largest image we store, after compression. */
export const MAX_STORED_BYTES = 5 * 1024 * 1024
/** Pictures are shrunk so their longest side is at most this many pixels. */
export const MAX_IMAGE_EDGE = 1600
export const MAX_ATTACHMENTS_PER_ITEM = 10

const MAX_FILE_NAME_LENGTH = 120

const EXTENSIONS: Record<AllowedImageType, string> = {
  'image/png': '.png',
  'image/jpeg': '.jpg',
  'image/webp': '.webp',
  'image/gif': '.gif',
}

export function isAllowedImageType(type: string): type is AllowedImageType {
  return (ALLOWED_IMAGE_TYPES as readonly string[]).includes(type)
}

/** Scales down so the longest side fits. Never makes an image bigger. */
export function fitWithin(
  width: number,
  height: number,
  maxEdge: number = MAX_IMAGE_EDGE,
): { width: number; height: number } {
  const longest = Math.max(width, height)
  if (longest <= maxEdge) return { width, height }
  const scale = maxEdge / longest
  return {
    width: Math.max(1, Math.round(width * scale)),
    height: Math.max(1, Math.round(height * scale)),
  }
}

/** Removes folders and control characters and limits the length. Never returns "". */
export function cleanFileName(name: string): string {
  const base = name.split(/[\\/]/).pop() ?? ''
  const cleaned = stripControlChars(base).trim()
  if (!cleaned) return 'image'
  if (cleaned.length <= MAX_FILE_NAME_LENGTH) return cleaned

  const dot = cleaned.lastIndexOf('.')
  const extension = dot > 0 && cleaned.length - dot <= 10 ? cleaned.slice(dot) : ''
  return cleaned.slice(0, MAX_FILE_NAME_LENGTH - extension.length) + extension
}

/** Gives a file name the extension that matches its type. */
export function withExtension(fileName: string, type: AllowedImageType): string {
  const stem = fileName.replace(/\.[A-Za-z0-9]{1,5}$/, '')
  return `${stem || 'image'}${EXTENSIONS[type]}`
}

export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) {
    return `${(bytes / 1024).toFixed(bytes < 10 * 1024 ? 1 : 0)} KB`
  }
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}