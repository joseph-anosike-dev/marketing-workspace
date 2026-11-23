const CHUNK_SIZE = 0x8000

/** Encodes a file as base64 text (used for backups). */
export async function blobToBase64(blob: Blob): Promise<string> {
  const bytes = new Uint8Array(await blob.arrayBuffer())
  let binary = ''
  // Work in chunks so large images do not overflow the call stack.
  for (let i = 0; i < bytes.length; i += CHUNK_SIZE) {
    binary += String.fromCharCode(...bytes.subarray(i, i + CHUNK_SIZE))
  }
  return btoa(binary)
}

export function base64ToBlob(base64: string, mimeType: string): Blob {
  const binary = atob(base64)
  const bytes = new Uint8Array(binary.length)
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i)
  return new Blob([bytes], { type: mimeType })
}

export function isValidBase64(value: string): boolean {
  return value.length % 4 === 0 && /^[A-Za-z0-9+/]*={0,2}$/.test(value)
}

/** Size in bytes of the data inside valid base64 text. */
export function decodedByteLength(base64: string): number {
  if (base64.length === 0) return 0
  const padding = base64.endsWith('==') ? 2 : base64.endsWith('=') ? 1 : 0
  return (base64.length / 4) * 3 - padding
}