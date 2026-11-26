import { Capacitor } from '@capacitor/core'
import { Filesystem } from '@capacitor/filesystem'
import type { SharedFileRef } from './shareContent'

/** Decodes base64 text into bytes. */
function base64ToBytes(base64: string): Uint8Array<ArrayBuffer> {
  const binary = atob(base64)
  const bytes = new Uint8Array(binary.length)
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i)
  return bytes
}

/**
 * Reads a "data:" address by hand. The app's security policy only lets it
 * fetch from itself, so fetch() cannot be used for these.
 */
export function dataUrlToBlob(dataUrl: string): Blob {
  const comma = dataUrl.indexOf(',')
  if (!dataUrl.startsWith('data:') || comma === -1) {
    throw new Error('The shared file is not readable.')
  }
  const header = dataUrl.slice(5, comma)
  const payload = dataUrl.slice(comma + 1)
  const type = header.split(';')[0] || 'application/octet-stream'
  if (header.includes(';base64')) return new Blob([base64ToBytes(payload)], { type })
  return new Blob([decodeURIComponent(payload)], { type })
}

async function readBlob(uri: string): Promise<Blob> {
  if (uri.startsWith('data:')) return dataUrlToBlob(uri)

  if (/^https?:|^blob:/.test(uri)) {
    const response = await fetch(uri)
    if (!response.ok) throw new Error('The shared file could not be loaded.')
    return response.blob()
  }

  // A file the share plugin saved on the phone (a path or a file:// address).
  try {
    const { data } = await Filesystem.readFile({ path: uri })
    return typeof data === 'string' ? new Blob([base64ToBytes(data)]) : data
  } catch (firstError) {
    // Second route: ask the app's own web server for the file.
    try {
      const response = await fetch(Capacitor.convertFileSrc(uri))
      if (!response.ok) throw firstError
      return await response.blob()
    } catch {
      throw firstError
    }
  }
}

/** Turns a shared file reference into a File the normal image pipeline can take. */
export async function loadSharedFile(ref: SharedFileRef): Promise<File> {
  const blob = await readBlob(ref.uri)
  const type = ref.mimeType || blob.type
  return new File([blob], ref.name || 'screenshot', { type })
}
