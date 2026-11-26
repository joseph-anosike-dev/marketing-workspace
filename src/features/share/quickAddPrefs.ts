import { SECTIONS, type Section } from '@/types'

const SECTION_KEY = 'quickadd.section'
const PROJECT_KEY = 'quickadd.project'

function read(key: string): string | null {
  try {
    return localStorage.getItem(key)
  } catch {
    return null
  }
}

function write(key: string, value: string) {
  try {
    localStorage.setItem(key, value)
  } catch {
    // Storage can be unavailable; remembering is a convenience, not a need.
  }
}

/** The section used last time, so a run of similar findings needs no re-picking. */
export function lastSection(): Section {
  const saved = read(SECTION_KEY)
  return (SECTIONS as readonly string[]).includes(saved ?? '') ? (saved as Section) : 'market'
}

/** The project used last time, or '' for none. The page checks that it still exists. */
export function lastProjectId(): string {
  return read(PROJECT_KEY) ?? ''
}

export function rememberChoices(section: Section, projectId: string) {
  write(SECTION_KEY, section)
  write(PROJECT_KEY, projectId)
}
