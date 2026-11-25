import { Capacitor } from '@capacitor/core'
import { Directory, Encoding, Filesystem } from '@capacitor/filesystem'
import { Share } from '@capacitor/share'

/** True inside the installed Android app, false in a normal browser. */
export function isNativeApp(): boolean {
  return Capacitor.isNativePlatform()
}

function startBrowserDownload(blob: Blob, fileName: string, revokeAfterMs: number): void {
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = fileName
  document.body.appendChild(link)
  link.click()
  link.remove()
  // Give the browser time to start the download before freeing the memory.
  window.setTimeout(() => URL.revokeObjectURL(url), revokeAfterMs)
}

function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onerror = () => reject(reader.error ?? new Error('Could not read the file.'))
    reader.onload = () => {
      const result = String(reader.result)
      resolve(result.slice(result.indexOf(',') + 1))
    }
    reader.readAsDataURL(blob)
  })
}

/** Closing the share sheet without choosing anything is not an error. */
function isShareCancelled(error: unknown): boolean {
  const message = error instanceof Error ? error.message : String(error)
  return /cancel/i.test(message)
}

/**
 * Inside the app a link click cannot save a file. Instead the file is written
 * to temporary storage and Android's share sheet opens, from where it can be
 * saved to Files or Drive, or sent to another app.
 */
async function shareNativeFile(
  fileName: string,
  content: { text: string } | { blob: Blob },
): Promise<void> {
  const safeName = fileName.replace(/[\\/]/g, '_')
  const written = await Filesystem.writeFile(
    'text' in content
      ? {
          path: safeName,
          data: content.text,
          directory: Directory.Cache,
          encoding: Encoding.UTF8,
        }
      : {
          path: safeName,
          data: await blobToBase64(content.blob),
          directory: Directory.Cache,
        },
  )
  try {
    await Share.share({ title: safeName, dialogTitle: 'Save or share', url: written.uri })
  } catch (error) {
    if (!isShareCancelled(error)) throw error
  }
}

/** Saves a text file: a browser download, or the share sheet inside the app. */
export async function downloadTextFile(
  fileName: string,
  text: string,
  mimeType = 'text/plain',
): Promise<void> {
  if (isNativeApp()) return shareNativeFile(fileName, { text })
  startBrowserDownload(new Blob([text], { type: `${mimeType};charset=utf-8` }), fileName, 1000)
}

/** Saves a binary file, such as a zip: a browser download, or the share sheet inside the app. */
export async function downloadBinaryFile(
  fileName: string,
  bytes: Uint8Array<ArrayBuffer>,
  mimeType = 'application/octet-stream',
): Promise<void> {
  const blob = new Blob([bytes], { type: mimeType })
  if (isNativeApp()) return shareNativeFile(fileName, { blob })
  // Larger files get longer before their memory is freed.
  startBrowserDownload(blob, fileName, 30_000)
}
