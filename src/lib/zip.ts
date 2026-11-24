import { crc32 } from '@/lib/crc32'
import { formatBytes } from '@/lib/images'

/** The zip is built in memory, so very large exports are refused with a clear message. */
export const MAX_ZIP_BYTES = 250 * 1024 * 1024
// The classic zip format stores counts and sizes in 16 and 32 bits.
const MAX_ENTRIES = 65_535
const MAX_FORMAT_BYTES = 0xffffffff

export class ZipError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'ZipError'
  }
}

export interface ZipEntry {
  /** Forward slashes, no leading slash, for example "project/market/note.md". */
  path: string
  data: Uint8Array | string
  modified?: Date
}

export interface ZipOptions {
  /** Used for entries that have no valid modified date. */
  fallbackDate?: Date
  maxBytes?: number
}

const encoder = new TextEncoder()

function checkPath(path: string): void {
  const unsafe =
    path === '' ||
    path.startsWith('/') ||
    path.endsWith('/') ||
    path.includes('\\') ||
    /[\u0000-\u001f\u007f]/.test(path) ||
    path.split('/').some((part) => part === '' || part === '.' || part === '..')
  if (unsafe) throw new ZipError(`Unsafe file path in export: "${path}".`)
}

function dosDateTime(date: Date): { time: number; date: number } {
  const year = Math.min(Math.max(date.getFullYear(), 1980), 2107)
  return {
    time:
      (date.getHours() << 11) | (date.getMinutes() << 5) | (date.getSeconds() >> 1),
    date: ((year - 1980) << 9) | ((date.getMonth() + 1) << 5) | date.getDate(),
  }
}

/**
 * Builds a standard .zip file. Files are stored without compression (images
 * are already compressed and notes are tiny), which keeps this simple and
 * very reliable. File names are saved as UTF-8.
 */
export function createZip(
  entries: ZipEntry[],
  options: ZipOptions = {},
): Uint8Array<ArrayBuffer> {
  const fallback = options.fallbackDate ?? new Date()
  const maxBytes = Math.min(options.maxBytes ?? MAX_ZIP_BYTES, MAX_FORMAT_BYTES)

  if (entries.length > MAX_ENTRIES) {
    throw new ZipError(
      `Too many files for one zip (${entries.length}). Narrow your filters or export one project at a time.`,
    )
  }

  const seen = new Set<string>()
  const files = entries.map((entry) => {
    checkPath(entry.path)
    const key = entry.path.toLowerCase()
    if (seen.has(key)) {
      throw new ZipError(`Duplicate file path in export: "${entry.path}".`)
    }
    seen.add(key)

    const data = typeof entry.data === 'string' ? encoder.encode(entry.data) : entry.data
    const modified =
      entry.modified && !Number.isNaN(entry.modified.getTime())
        ? entry.modified
        : fallback
    return {
      name: encoder.encode(entry.path),
      data,
      stamp: dosDateTime(modified),
      crc: crc32(data),
      offset: 0,
    }
  })

  let total = 22
  for (const file of files) {
    total += 30 + file.name.length + file.data.length + 46 + file.name.length
  }
  if (total > maxBytes) {
    throw new ZipError(
      `This export is too large (${formatBytes(total)}; the limit is ${formatBytes(maxBytes)}). Narrow your filters or export one project at a time.`,
    )
  }

  const out = new Uint8Array(total)
  const view = new DataView(out.buffer)
  let pos = 0

  // 1. Each file: a small header, then its bytes.
  for (const file of files) {
    file.offset = pos
    view.setUint32(pos, 0x04034b50, true)
    view.setUint16(pos + 4, 20, true) // version needed
    view.setUint16(pos + 6, 0x0800, true) // flag: names are UTF-8
    view.setUint16(pos + 8, 0, true) // method: stored
    view.setUint16(pos + 10, file.stamp.time, true)
    view.setUint16(pos + 12, file.stamp.date, true)
    view.setUint32(pos + 14, file.crc, true)
    view.setUint32(pos + 18, file.data.length, true)
    view.setUint32(pos + 22, file.data.length, true)
    view.setUint16(pos + 26, file.name.length, true)
    view.setUint16(pos + 28, 0, true) // no extra field
    out.set(file.name, pos + 30)
    out.set(file.data, pos + 30 + file.name.length)
    pos += 30 + file.name.length + file.data.length
  }

  // 2. The directory that lists every file.
  const directoryStart = pos
  for (const file of files) {
    view.setUint32(pos, 0x02014b50, true)
    view.setUint16(pos + 4, 20, true) // made by
    view.setUint16(pos + 6, 20, true) // version needed
    view.setUint16(pos + 8, 0x0800, true)
    view.setUint16(pos + 10, 0, true)
    view.setUint16(pos + 12, file.stamp.time, true)
    view.setUint16(pos + 14, file.stamp.date, true)
    view.setUint32(pos + 16, file.crc, true)
    view.setUint32(pos + 20, file.data.length, true)
    view.setUint32(pos + 24, file.data.length, true)
    view.setUint16(pos + 28, file.name.length, true)
    view.setUint16(pos + 30, 0, true) // extra field length
    view.setUint16(pos + 32, 0, true) // comment length
    view.setUint16(pos + 34, 0, true) // disk number
    view.setUint16(pos + 36, 0, true) // internal attributes
    view.setUint32(pos + 38, 0, true) // external attributes
    view.setUint32(pos + 42, file.offset, true)
    out.set(file.name, pos + 46)
    pos += 46 + file.name.length
  }

  // 3. The end marker.
  view.setUint32(pos, 0x06054b50, true)
  view.setUint16(pos + 4, 0, true)
  view.setUint16(pos + 6, 0, true)
  view.setUint16(pos + 8, files.length, true)
  view.setUint16(pos + 10, files.length, true)
  view.setUint32(pos + 12, pos - directoryStart, true)
  view.setUint32(pos + 16, directoryStart, true)
  view.setUint16(pos + 20, 0, true)

  return out
}