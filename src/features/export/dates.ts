function pad(value: number): string {
  return String(value).padStart(2, '0')
}

function toDate(value: string | Date): Date | null {
  const date = value instanceof Date ? value : new Date(value)
  return Number.isNaN(date.getTime()) ? null : date
}

/**
 * "2026-11-24" in the person's local time zone, or null for a bad date.
 */
export function localDate(value: string | Date): string | null {
  const date = toDate(value)
  if (!date) return null
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`
}

/**
 * "2026-11-24T14:30:05" in local time, with no "Z" or offset. Obsidian
 * recognises this exact shape as a date-and-time property.
 */
export function localDateTime(value: string | Date): string | null {
  const date = toDate(value)
  if (!date) return null
  return `${localDate(date)}T${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`
}

/** Today's date for file names. Never fails. */
export function fileDate(now: Date): string {
  return localDate(now) ?? 'export'
}