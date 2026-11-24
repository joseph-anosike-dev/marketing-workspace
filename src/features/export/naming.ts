/** Image types we store, and the extension each one gets inside an export. */
export const IMAGE_EXTENSIONS: Record<string, string | undefined> = {
  'image/png': '.png',
  'image/jpeg': '.jpg',
  'image/webp': '.webp',
  'image/gif': '.gif',
}

// Windows refuses names such as "con.md", so these get a suffix.
const RESERVED_NAME = /^(con|prn|aux|nul|com[1-9]|lpt[1-9])$/

/**
 * Lowercase letters, numbers and hyphens only, so links never need encoding.
 * Accents are removed ("café" becomes "cafe"). Text with no usable
 * characters (for example only emoji) becomes the fallback.
 */
export function slugify(text: string, fallback = 'untitled', maxLength = 60): string {
  let slug = text
    .normalize('NFKD')
    .replace(/\p{M}/gu, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
  if (slug.length > maxLength) slug = slug.slice(0, maxLength).replace(/-+$/, '')
  if (!slug) slug = fallback
  return RESERVED_NAME.test(slug) ? `${slug}-file` : slug
}

export interface Namer {
  /** Reserves a file path. A taken path gets -2, -3 and so on. */
  claim(dir: string, base: string, extension: string): string
}

/** Hands out unique file paths. Comparison ignores case, as Windows and macOS do. */
export function createNamer(): Namer {
  const used = new Set<string>()
  return {
    claim(dir, base, extension) {
      const prefix = dir ? `${dir}/` : ''
      let candidate = `${prefix}${base}${extension}`
      for (let n = 2; used.has(candidate.toLowerCase()); n++) {
        candidate = `${prefix}${base}-${n}${extension}`
      }
      used.add(candidate.toLowerCase())
      return candidate
    },
  }
}

/** The path of one file as seen from another file, for example "../attachments/a.png". */
export function relativePath(fromFile: string, toFile: string): string {
  const fromFolders = fromFile.split('/').slice(0, -1)
  const toParts = toFile.split('/')
  let shared = 0
  while (
    shared < fromFolders.length &&
    shared < toParts.length - 1 &&
    fromFolders[shared] === toParts[shared]
  ) {
    shared++
  }
  const ups = fromFolders.length - shared
  return [...Array<string>(ups).fill('..'), ...toParts.slice(shared)].join('/')
}