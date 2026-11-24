import { createZip, type ZipEntry } from '@/lib/zip'
import type { Attachment, Project, ResearchItemView } from '@/types'
import { fileDate } from './dates'
import {
  indexToMarkdown,
  noteToMarkdown,
  type IndexInput,
  type IndexRow,
  type NoteImage,
} from './markdown'
import {
  IMAGE_EXTENSIONS,
  createNamer,
  relativePath,
  slugify,
  type Namer,
} from './naming'

/** A finding together with everything an export needs to write it. */
export interface ExportFinding {
  item: ResearchItemView
  attachments: Attachment[]
  /** The name of the finding's project, or null when it has none. */
  projectName: string | null
}

export interface ExportFile {
  fileName: string
  mimeType: string
  bytes: Uint8Array<ArrayBuffer>
}

export interface ExportResult {
  file: ExportFile
  /** Things that were left out, in plain words, to show the person. */
  warnings: string[]
  findingCount: number
  imageCount: number
}

interface StagedNote {
  path: string
  text: string
  modified: Date
}

interface Staged {
  notes: StagedNote[]
  images: ZipEntry[]
  rows: IndexRow[]
  warnings: string[]
}

const encoder = new TextEncoder()

function imageAlt(fileName: string): string {
  return fileName.replace(/\.[A-Za-z0-9]{1,5}$/, '') || 'image'
}

/** Decides every file path and writes every note. Images are read from their stored files. */
async function stage(
  findings: ExportFinding[],
  root: string,
  withSectionFolders: boolean,
  namer: Namer,
): Promise<Staged> {
  // Oldest first, so when two titles match the later one gets the "-2".
  const ordered = [...findings].sort(
    (a, b) =>
      a.item.created_at.localeCompare(b.item.created_at) ||
      a.item.id.localeCompare(b.item.id),
  )
  const staged: Staged = { notes: [], images: [], rows: [], warnings: [] }

  for (const { item, attachments, projectName } of ordered) {
    const folder = withSectionFolders ? `${root}/${item.section}` : root
    const notePath = namer.claim(folder, slugify(item.title), '.md')
    const noteName = notePath.slice(notePath.lastIndexOf('/') + 1, -'.md'.length)

    const noteImages: NoteImage[] = []
    for (const attachment of attachments) {
      const extension = IMAGE_EXTENSIONS[attachment.mime_type]
      if (!attachment.blob || !extension) {
        staged.warnings.push(
          `Left out the image “${attachment.file_name}” from “${item.title}”: its file is not available.`,
        )
        continue
      }
      const imagePath = namer.claim(
        `${root}/attachments`,
        `${noteName}-${noteImages.length + 1}`,
        extension,
      )
      staged.images.push({
        path: imagePath,
        data: new Uint8Array(await attachment.blob.arrayBuffer()),
        modified: new Date(attachment.created_at),
      })
      noteImages.push({
        alt: imageAlt(attachment.file_name),
        path: relativePath(notePath, imagePath),
      })
    }

    staged.notes.push({
      path: notePath,
      text: noteToMarkdown(item, projectName, noteImages),
      modified: new Date(item.updated_at),
    })
    staged.rows.push({
      title: item.title,
      target: notePath.slice(0, -'.md'.length),
      section: item.section,
      projectName,
      source: item.source_url,
      tags: item.tags,
      updatedAt: item.updated_at,
    })
  }
  return staged
}

type FolderMeta = Omit<IndexInput, 'rows' | 'imageCount' | 'exportedAt'>

/** A zip with one top-level folder: an index note, notes in section folders, and attachments. */
async function buildFolderExport(
  root: string,
  findings: ExportFinding[],
  meta: FolderMeta,
  now: Date,
): Promise<ExportResult> {
  const namer = createNamer()
  const indexPath = namer.claim(root, root, '.md')
  const staged = await stage(findings, root, true, namer)

  const indexText = indexToMarkdown({
    ...meta,
    exportedAt: now,
    imageCount: staged.images.length,
    rows: staged.rows,
  })

  const bytes = createZip(
    [
      { path: indexPath, data: indexText, modified: now },
      ...staged.notes.map((note) => ({
        path: note.path,
        data: note.text,
        modified: note.modified,
      })),
      ...staged.images,
    ],
    { fallbackDate: now },
  )

  return {
    file: {
      fileName: `${root}-${fileDate(now)}.zip`,
      mimeType: 'application/zip',
      bytes,
    },
    warnings: staged.warnings,
    findingCount: findings.length,
    imageCount: staged.images.length,
  }
}

/**
 * One finding. A finding without images is a single .md file. One with images
 * is a zip holding a folder: the note plus an attachments folder.
 */
export async function exportFinding(
  finding: ExportFinding,
  now: Date = new Date(),
): Promise<ExportResult> {
  const slug = slugify(finding.item.title)
  const staged = await stage([finding], slug, false, createNamer())

  if (staged.images.length === 0) {
    return {
      file: {
        fileName: `${slug}.md`,
        mimeType: 'text/markdown',
        bytes: encoder.encode(staged.notes[0].text),
      },
      warnings: staged.warnings,
      findingCount: 1,
      imageCount: 0,
    }
  }

  const bytes = createZip(
    [
      ...staged.notes.map((note) => ({
        path: note.path,
        data: note.text,
        modified: note.modified,
      })),
      ...staged.images,
    ],
    { fallbackDate: now },
  )
  return {
    file: { fileName: `${slug}.zip`, mimeType: 'application/zip', bytes },
    warnings: staged.warnings,
    findingCount: 1,
    imageCount: staged.images.length,
  }
}

/** A whole project: index note, section folders and attachments. */
export function exportProject(
  project: Project,
  findings: ExportFinding[],
  now: Date = new Date(),
): Promise<ExportResult> {
  return buildFolderExport(
    slugify(project.name, 'project'),
    findings,
    {
      type: 'research-project',
      title: project.name,
      description: project.description,
      status: project.status,
      createdAt: project.created_at,
      updatedAt: project.updated_at,
      showProject: false,
    },
    now,
  )
}

/** Any list of findings, such as what the Vault shows for the current search and filters. */
export async function exportCollection(
  findings: ExportFinding[],
  options: { title?: string; filters?: string } = {},
  now: Date = new Date(),
): Promise<ExportResult> {
  if (findings.length === 0) throw new Error('There are no findings to export.')
  const title = options.title ?? 'Research Vault'
  return buildFolderExport(
    slugify(title, 'research-vault'),
    findings,
    {
      type: 'research-vault',
      title,
      filters: options.filters,
      showProject: true,
    },
    now,
  )
}