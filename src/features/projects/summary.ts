import { SECTIONS, type Section } from '@/types'

/** How many items each project has. Items with no project are not counted. */
export function countByProject(
  items: ReadonlyArray<{ project_id: string | null }>,
): Map<string, number> {
  const counts = new Map<string, number>()
  for (const item of items) {
    if (item.project_id) {
      counts.set(item.project_id, (counts.get(item.project_id) ?? 0) + 1)
    }
  }
  return counts
}

/** How many items each section has, including sections with none. */
export function countBySection(
  items: ReadonlyArray<{ section: Section }>,
): Record<Section, number> {
  const counts = Object.fromEntries(SECTIONS.map((s) => [s, 0])) as Record<
    Section,
    number
  >
  for (const item of items) counts[item.section] += 1
  return counts
}

/** Reads ?section= from the address. Unknown values mean "all sections". */
export function readSection(params: URLSearchParams): Section | '' {
  const value = params.get('section') ?? ''
  return (SECTIONS as readonly string[]).includes(value) ? (value as Section) : ''
}