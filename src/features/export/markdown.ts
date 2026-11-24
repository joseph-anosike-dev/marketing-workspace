import { SECTION_FIELDS } from '@/features/projects/sectionFields'
import { plural } from '@/lib/format'
import {
  SECTIONS,
  SECTION_LABELS,
  type ResearchItemView,
  type Section,
} from '@/types'
import { localDate, localDateTime } from './dates'
import { buildFrontmatter, yamlRaw, type YamlValue } from './yaml'

export interface NoteImage {
  alt: string
  /** Where the image is, as seen from the note, for example "../attachments/a.png". */
  path: string
}

function oneLine(text: string): string {
  return text.replace(/\s+/g, ' ').trim()
}

function safeHref(url: string): string {
  try {
    return new URL(url).href
  } catch {
    return url
  }
}

/** One finding as an Obsidian note: properties, heading, notes, source and images. */
export function noteToMarkdown(
  item: ResearchItemView,
  projectName: string | null,
  images: NoteImage[],
): string {
  const properties: Array<[string, YamlValue]> = [
    ['title', oneLine(item.title)],
    ['section', SECTION_LABELS[item.section]],
  ]
  if (projectName) properties.push(['project', projectName])
  if (item.source_url) properties.push(['source', item.source_url])
  properties.push(['tags', item.tags])

  const created = localDateTime(item.created_at)
  if (created) properties.push(['created', yamlRaw(created)])
  const updated = localDateTime(item.updated_at)
  if (updated) properties.push(['updated', yamlRaw(updated)])

  for (const field of SECTION_FIELDS[item.section]) {
    const value = item.metadata[field.key]
    if (typeof value === 'string' && value.trim()) {
      properties.push([field.key, value.trim()])
    }
  }
  properties.push(['id', item.id])

  const parts = [buildFrontmatter(properties), `# ${oneLine(item.title)}`]

  // The notes are kept exactly as written; only blank space around them is dropped.
  const body = item.body.replace(/\s+$/, '').replace(/^(?:[ \t]*\r?\n)+/, '')
  if (body) parts.push(body)

  if (item.source_url) parts.push(`**Source:** <${safeHref(item.source_url)}>`)

  if (images.length > 0) {
    parts.push('## Images')
    for (const image of images) {
      parts.push(`![${image.alt.replace(/[[\]]/g, '')}](${image.path})`)
    }
  }

  return `${parts.join('\n\n')}\n`
}

export interface IndexRow {
  title: string
  /** Where the note is, without ".md", for example "acme/market/pricing". */
  target: string
  section: Section
  projectName: string | null
  source: string | null
  tags: string[]
  updatedAt: string
}

export interface IndexInput {
  type: 'research-project' | 'research-vault'
  title: string
  description?: string
  /** A readable summary of the search and filters used (Vault exports). */
  filters?: string
  status?: string
  createdAt?: string
  updatedAt?: string
  exportedAt: Date
  imageCount: number
  rows: IndexRow[]
  /** Adds a Project column, for exports that mix several projects. */
  showProject: boolean
}

/** Makes text safe inside a Markdown table cell. */
function cell(text: string): string {
  return oneLine(text).replace(/[\\|[\]`*<>]/g, '\\$&')
}

function wikiAlias(title: string): string {
  return title.replace(/[[\]|\\]/g, ' ').replace(/\s+/g, ' ').trim() || 'Untitled'
}

/** A link in Obsidian's [[path|name]] form. The "|" is escaped because it sits in a table. */
function wikiLinkInTable(target: string, title: string): string {
  return `[[${target}\\|${wikiAlias(title)}]]`
}

function sourceCell(url: string | null): string {
  if (!url) return ''
  return `<${safeHref(url).replace(/\|/g, '%7C')}>`
}

/** The index note of a project or Vault export: summary counts and a table per section. */
export function indexToMarkdown(input: IndexInput): string {
  const properties: Array<[string, YamlValue]> = [
    ['title', oneLine(input.title)],
    ['type', input.type],
  ]
  if (input.description) properties.push(['description', oneLine(input.description)])
  if (input.status) properties.push(['status', input.status])
  const created = input.createdAt ? localDateTime(input.createdAt) : null
  if (created) properties.push(['created', yamlRaw(created)])
  const updated = input.updatedAt ? localDateTime(input.updatedAt) : null
  if (updated) properties.push(['updated', yamlRaw(updated)])
  const exported = localDateTime(input.exportedAt)
  if (exported) properties.push(['exported', yamlRaw(exported)])
  properties.push(['findings', input.rows.length])
  properties.push(['images', input.imageCount])

  const parts = [buildFrontmatter(properties), `# ${oneLine(input.title)}`]
  if (input.description?.trim()) parts.push(input.description.trim())
  if (input.filters) parts.push(`> Filters used: ${oneLine(input.filters)}`)

  const bySection = new Map<Section, IndexRow[]>()
  for (const row of input.rows) {
    const list = bySection.get(row.section) ?? []
    list.push(row)
    bySection.set(row.section, list)
  }

  const summary = ['| Section | Findings |', '| --- | ---: |']
  for (const section of SECTIONS) {
    const count = bySection.get(section)?.length ?? 0
    if (count > 0) summary.push(`| ${SECTION_LABELS[section]} | ${count} |`)
  }
  summary.push(`| **Total** | **${input.rows.length}** |`)
  parts.push('## Summary', summary.join('\n'))
  parts.push(
    `${plural(input.imageCount, 'image')} saved in the attachments folder.`,
  )

  if (input.rows.length === 0) parts.push('_No findings yet._')

  for (const section of SECTIONS) {
    const rows = bySection.get(section)
    if (!rows) continue
    rows.sort(
      (a, b) => b.updatedAt.localeCompare(a.updatedAt) || a.title.localeCompare(b.title),
    )

    const head = input.showProject
      ? ['| Finding | Project | Source | Tags | Updated |', '| --- | --- | --- | --- | --- |']
      : ['| Finding | Source | Tags | Updated |', '| --- | --- | --- | --- |']
    const lines = rows.map((row) => {
      const cells = [wikiLinkInTable(row.target, row.title)]
      if (input.showProject) cells.push(row.projectName ? cell(row.projectName) : '')
      cells.push(
        sourceCell(row.source),
        row.tags.map((tag) => `#${tag}`).join(' '),
        localDate(row.updatedAt) ?? '',
      )
      return `| ${cells.join(' | ')} |`
    })
    parts.push(`## ${SECTION_LABELS[section]}`, [...head, ...lines].join('\n'))
  }

  return `${parts.join('\n\n')}\n`
}