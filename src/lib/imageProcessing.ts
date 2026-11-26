import type { NewAttachment } from '@/data/repositories/attachment-types'
import {
  MAX_INPUT_BYTES,
  MAX_STORED_BYTES,
  cleanFileName,
  fitWithin,
  formatBytes,
  isAllowedImageType,
  withExtension,
  type AllowedImageType,
} from '@/lib/images'

/** Pictures at or below this size, and already small enough, are stored untouched. */
export const KEEP_BELOW_BYTES = 400 * 1024

const QUALITIES = [0.85, 0.7, 0.5]

export interface ImagePlan {
  action: 'keep' | 'reencode'
  width: number
  height: number
}

/** Decides what to do with a picture. Pure, so it can be tested without a browser. */
export function planImage(input: {
  type: AllowedImageType
  size: number
  width: number
  height: number
}): ImagePlan {
  const { type, size, width, height } = input
  // Re-encoding would flatten an animated GIF, so GIFs are never touched.
  if (type === 'image/gif') return { action: 'keep', width, height }

  const fit = fitWithin(width, height)
  const resized = fit.width !== width || fit.height !== height
  if (!resized && size <= KEEP_BELOW_BYTES) {
    return { action: 'keep', width, height }
  }
  return { action: 'reencode', ...fit }
}

/** Replaces the generic name browsers give pasted images ("image.png") with a dated one. */
export function friendlyFileName(name: string, now: Date = new Date()): string {
  const cleaned = cleanFileName(name)
  const match = /^image(\.(?:png|jpe?g|gif|webp))$/i.exec(cleaned)
  if (!match) return cleaned
  const stamp = now
    .toISOString()
    .slice(0, 19)
    .replace(/[-:]/g, '')
    .replace('T', '-')
  return `screenshot-${stamp}${match[1].toLowerCase()}`
}

/* ---------- Browser-only part (uses canvas, tested by hand) ---------- */

function draw(
  bitmap: ImageBitmap,
  width: number,
  height: number,
  background?: string,
): HTMLCanvasElement {
  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height
  const context = canvas.getContext('2d')
  if (!context) throw new Error('This browser cannot process images.')
  if (background) {
    context.fillStyle = background
    context.fillRect(0, 0, width, height)
  }
  context.imageSmoothingQuality = 'high'
  context.drawImage(bitmap, 0, 0, width, height)
  return canvas
}

function toBlob(
  canvas: HTMLCanvasElement,
  type: string,
  quality: number,
): Promise<Blob | null> {
  return new Promise((resolve) => canvas.toBlob(resolve, type, quality))
}

async function encode(
  bitmap: ImageBitmap,
  width: number,
  height: number,
): Promise<{ blob: Blob; type: 'image/webp' | 'image/jpeg' }> {
  const canvas = draw(bitmap, width, height)
  for (const quality of QUALITIES) {
    const webp = await toBlob(canvas, 'image/webp', quality)
    if (webp && webp.type === 'image/webp') {
      if (webp.size <= MAX_STORED_BYTES) return { blob: webp, type: 'image/webp' }
      continue
    }
    // This browser cannot write WebP. Fall back to JPEG on a white background,
    // because JPEG has no transparency.
    const flat = draw(bitmap, width, height, '#ffffff')
    const jpeg = await toBlob(flat, 'image/jpeg', quality)
    if (jpeg && jpeg.type === 'image/jpeg' && jpeg.size <= MAX_STORED_BYTES) {
      return { blob: jpeg, type: 'image/jpeg' }
    }
  }
  throw new Error('is still too large after shrinking')
}

/**
 * Checks a picked or pasted file and shrinks it if needed.
 * Throws an error with a readable message when the file cannot be used.
 */
export async function prepareImage(file: File): Promise<NewAttachment> {
  const name = friendlyFileName(file.name)
  const type = file.type

  if (!isAllowedImageType(type)) {
    throw new Error(`“${name}” is not a supported image. Use PNG, JPEG, WebP or GIF.`)
  }
  if (file.size === 0) throw new Error(`“${name}” is empty.`)
  if (file.size > MAX_INPUT_BYTES) {
    throw new Error(`“${name}” is too large (limit ${formatBytes(MAX_INPUT_BYTES)}).`)
  }

  const original: NewAttachment = { file_name: name, mime_type: type, blob: file }

  if (type === 'image/gif') {
    if (file.size > MAX_STORED_BYTES) {
      throw new Error(
        `“${name}” is too large for a GIF (limit ${formatBytes(MAX_STORED_BYTES)}). Animated GIFs cannot be shrunk.`,
      )
    }
    return original
  }

  let bitmap: ImageBitmap
  try {
    bitmap = await createImageBitmap(file, { imageOrientation: 'from-image' })
  } catch {
    throw new Error(`“${name}” could not be read as an image.`)
  }

  try {
    const plan = planImage({
      type,
      size: file.size,
      width: bitmap.width,
      height: bitmap.height,
    })
    if (plan.action === 'keep') return original

    let encoded: Awaited<ReturnType<typeof encode>>
    try {
      encoded = await encode(bitmap, plan.width, plan.height)
    } catch (e) {
      const reason = e instanceof Error ? e.message : 'could not be shrunk'
      throw new Error(`“${name}” ${reason}.`, { cause: e })
    }

    const resized = plan.width !== bitmap.width || plan.height !== bitmap.height
    // If shrinking did not help and the original is allowed, keep the original.
    if (!resized && encoded.blob.size >= file.size && file.size <= MAX_STORED_BYTES) {
      return original
    }

    return {
      file_name: withExtension(name, encoded.type),
      mime_type: encoded.type,
      blob: encoded.blob,
    }
  } finally {
    bitmap.close()
  }
}