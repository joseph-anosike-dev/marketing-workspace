import { crc32 } from '@/lib/crc32'

export interface ReadEntry {
  path: string
  bytes: Uint8Array
  flags: number
  method: number
  modified: Date
}

/**
 * A small, strict zip reader used only by tests. It follows the file the way
 * unzip programs do (end marker, then directory, then each file) and checks
 * every checksum, so a broken zip makes it throw.
 */
export function readZip(zip: Uint8Array): ReadEntry[] {
  const view = new DataView(zip.buffer, zip.byteOffset, zip.byteLength)
  const decoder = new TextDecoder('utf-8', { fatal: true })

  let end = -1
  for (let i = zip.length - 22; i >= 0; i--) {
    if (view.getUint32(i, true) === 0x06054b50) {
      end = i
      break
    }
  }
  if (end < 0) throw new Error('No end marker found')

  const count = view.getUint16(end + 10, true)
  if (view.getUint16(end + 8, true) !== count) throw new Error('Entry counts differ')
  const directorySize = view.getUint32(end + 12, true)
  const directoryStart = view.getUint32(end + 16, true)
  if (directoryStart + directorySize !== end) throw new Error('Directory is misplaced')

  const entries: ReadEntry[] = []
  let pos = directoryStart
  for (let n = 0; n < count; n++) {
    if (view.getUint32(pos, true) !== 0x02014b50) throw new Error('Bad directory entry')
    const flags = view.getUint16(pos + 8, true)
    const method = view.getUint16(pos + 10, true)
    const time = view.getUint16(pos + 12, true)
    const date = view.getUint16(pos + 14, true)
    const crc = view.getUint32(pos + 16, true)
    const compressed = view.getUint32(pos + 20, true)
    const size = view.getUint32(pos + 24, true)
    const nameLength = view.getUint16(pos + 28, true)
    const extraLength = view.getUint16(pos + 30, true)
    const commentLength = view.getUint16(pos + 32, true)
    const localOffset = view.getUint32(pos + 42, true)
    const path = decoder.decode(zip.subarray(pos + 46, pos + 46 + nameLength))
    pos += 46 + nameLength + extraLength + commentLength

    if (view.getUint32(localOffset, true) !== 0x04034b50) throw new Error('Bad file header')
    const localNameLength = view.getUint16(localOffset + 26, true)
    const localExtraLength = view.getUint16(localOffset + 28, true)
    const localName = decoder.decode(
      zip.subarray(localOffset + 30, localOffset + 30 + localNameLength),
    )
    if (localName !== path) throw new Error(`Names differ for ${path}`)
    if (view.getUint32(localOffset + 14, true) !== crc) throw new Error(`Checksums differ for ${path}`)

    const start = localOffset + 30 + localNameLength + localExtraLength
    if (compressed !== size || method !== 0) throw new Error('Only stored files are expected')
    const bytes = zip.slice(start, start + size)
    if (crc32(bytes) !== crc) throw new Error(`Checksum mismatch for ${path}`)

    const modified = new Date(
      ((date >> 9) & 0x7f) + 1980,
      ((date >> 5) & 0x0f) - 1,
      date & 0x1f,
      time >> 11,
      (time >> 5) & 0x3f,
      (time & 0x1f) * 2,
    )
    entries.push({ path, bytes, flags, method, modified })
  }
  if (pos !== end) throw new Error('Directory has leftover bytes')
  return entries
}

export function textOf(entry: ReadEntry): string {
  return new TextDecoder().decode(entry.bytes)
}