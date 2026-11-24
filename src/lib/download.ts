function startDownload(blob: Blob, fileName: string, revokeAfterMs: number): void {
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

/** Starts a browser download of a text file. */
export function downloadTextFile(
  fileName: string,
  text: string,
  mimeType = 'text/plain',
): void {
  startDownload(new Blob([text], { type: `${mimeType};charset=utf-8` }), fileName, 1000)
}

/** Starts a browser download of a binary file, such as a zip. */
export function downloadBinaryFile(
  fileName: string,
  bytes: Uint8Array<ArrayBuffer>,
  mimeType = 'application/octet-stream',
): void {
  // Larger files get longer before their memory is freed.
  startDownload(new Blob([bytes], { type: mimeType }), fileName, 30_000)
}
