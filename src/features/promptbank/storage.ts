import type { PlaceholderValues } from './placeholders'

const VALUES_KEY = 'promptbank.values'
const PROGRESS_PREFIX = 'promptbank.progress.'

function read(key: string): string | null {
  try {
    return localStorage.getItem(key)
  } catch {
    return null
  }
}

function write(key: string, value: string | null) {
  try {
    if (value === null) localStorage.removeItem(key)
    else localStorage.setItem(key, value)
  } catch {
    // Remembering is a convenience; the page still works without it.
  }
}

/** The niche, audience and so on typed last time, so they need typing only once. */
export function loadValues(): PlaceholderValues {
  try {
    const parsed: unknown = JSON.parse(read(VALUES_KEY) ?? '{}')
    if (typeof parsed !== 'object' || parsed === null) return {}
    const values: PlaceholderValues = {}
    for (const [k, v] of Object.entries(parsed)) if (typeof v === 'string') values[k] = v
    return values
  } catch {
    return {}
  }
}

export function saveValues(values: PlaceholderValues) {
  write(VALUES_KEY, JSON.stringify(values))
}

/** Ticked checklist rows for one guide. Only a tidy-up aid; it is never a research record. */
export function loadProgress(id: string, total: number): number[] {
  try {
    const parsed: unknown = JSON.parse(read(PROGRESS_PREFIX + id) ?? '[]')
    if (!Array.isArray(parsed)) return []
    return parsed.filter((n): n is number => Number.isInteger(n) && n >= 0 && n < total)
  } catch {
    return []
  }
}

export function saveProgress(id: string, done: number[]) {
  write(PROGRESS_PREFIX + id, done.length > 0 ? JSON.stringify(done) : null)
}
