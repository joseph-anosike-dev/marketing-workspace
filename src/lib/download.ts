/** Starts a browser download of a text file. */
export function downloadTextFile(
  fileName: string,
  text: string,
  mimeType = 'text/plain',
): void {
  const blob = new Blob([text], { type: `${mimeType};charset=utf-8` })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = fileName
  document.body.appendChild(link)
  link.click()
  link.remove()
  // Give the browser a moment to start the download before freeing memory.
  window.setTimeout(() => URL.revokeObjectURL(url), 1000)
}