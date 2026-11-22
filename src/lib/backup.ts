import { z } from 'zod'
import { db } from '@/lib/db'
import { nowIso } from '@/lib/ids'
import { ITEM_KINDS, PROJECT_STATUSES, SECTIONS } from '@/types'

export const BACKUP_APP_ID = 'marketing-workspace'
export const BACKUP_FORMAT_VERSION = 1

export class BackupError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'BackupError'
  }
}

function isHttpUrl(value: string): boolean {
  try {
    const url = new URL(value)
    return url.protocol === 'http:' || url.protocol === 'https:'
  } catch {
    return false
  }
}

const timestamp = z.string().min(1)

const recordBase = {
  id: z.string().min(1),
  owner_id: z.string().min(1),
  created_at: timestamp,
  updated_at: timestamp,
  deleted_at: timestamp.nullable(),
}

const projectRecord = z.object({
  ...recordBase,
  name: z.string().min(1).max(120),
  description: z.string().max(2000),
  status: z.enum(PROJECT_STATUSES),
})

const itemRecord = z.object({
  ...recordBase,
  project_id: z.string().min(1).nullable(),
  section: z.enum(SECTIONS),
  kind: z.enum(ITEM_KINDS),
  title: z.string().min(1).max(200),
  body: z.string().max(100_000),
  // Restored links must be http(s) only, same rule as when saving.
  source_url: z
    .string()
    .max(2048)
    .refine(isHttpUrl, {
      message: 'Must be a web address starting with http:// or https://',
    })
    .nullable(),
  metadata: z.record(z.string(), z.unknown()),
})

const tagRecord = z.object({
  id: z.string().min(1),
  owner_id: z.string().min(1),
  name: z.string().min(1).max(60),
  created_at: timestamp,
})

const linkRecord = z.object({
  item_id: z.string().min(1),
  tag_id: z.string().min(1),
})

const bookmarkRecord = z.object({
  id: z.string().min(1),
  owner_id: z.string().min(1),
  tool_id: z.string().min(1),
  created_at: timestamp,
})

const backupSchema = z.object({
  app: z.literal(BACKUP_APP_ID),
  format_version: z.number().int().min(1),
  exported_at: timestamp,
  tables: z.object({
    projects: z.array(projectRecord),
    research_items: z.array(itemRecord),
    tags: z.array(tagRecord),
    research_item_tags: z.array(linkRecord),
    bookmarks: z.array(bookmarkRecord),
  }),
})

export type BackupFile = z.infer<typeof backupSchema>
type BackupTables = BackupFile['tables']

export interface BackupSummary {
  projects: number
  items: number
  tags: number
  bookmarks: number
}

/** Counts what a user would recognise: live projects and items, all tags and bookmarks. */
export function summarizeBackup(backup: BackupFile): BackupSummary {
  const t = backup.tables
  return {
    projects: t.projects.filter((p) => !p.deleted_at).length,
    items: t.research_items.filter((i) => !i.deleted_at).length,
    tags: t.tags.length,
    bookmarks: t.bookmarks.length,
  }
}

const USER_TABLES = () => [
  db.projects,
  db.research_items,
  db.tags,
  db.research_item_tags,
  db.bookmarks,
]

/** Reads all user data in one consistent snapshot. Deleted records are included. */
export async function buildBackup(): Promise<BackupFile> {
  return db.transaction('r', USER_TABLES(), async () => {
    const [projects, research_items, tags, research_item_tags, bookmarks] =
      await Promise.all([
        db.projects.toArray(),
        db.research_items.toArray(),
        db.tags.toArray(),
        db.research_item_tags.toArray(),
        db.bookmarks.toArray(),
      ])
    return {
      app: BACKUP_APP_ID,
      format_version: BACKUP_FORMAT_VERSION,
      exported_at: nowIso(),
      tables: { projects, research_items, tags, research_item_tags, bookmarks },
    }
  })
}

function describeIssues(error: z.ZodError): string {
  const shown = error.issues
    .slice(0, 5)
    .map((i) => `${i.path.map(String).join('.') || '(file)'}: ${i.message}`)
  const more = error.issues.length - shown.length
  return shown.join('; ') + (more > 0 ? ` (+${more} more problems)` : '')
}

function hasDuplicate(values: string[]): boolean {
  return new Set(values).size !== values.length
}

function checkIntegrity(t: BackupTables): void {
  if (hasDuplicate(t.projects.map((p) => p.id)))
    throw new BackupError('The backup contains duplicate project ids.')
  if (hasDuplicate(t.research_items.map((i) => i.id)))
    throw new BackupError('The backup contains duplicate item ids.')
  if (hasDuplicate(t.tags.map((tag) => tag.id)))
    throw new BackupError('The backup contains duplicate tag ids.')
  if (hasDuplicate(t.tags.map((tag) => `${tag.owner_id}|${tag.name}`)))
    throw new BackupError('The backup contains duplicate tag names.')
  if (hasDuplicate(t.research_item_tags.map((l) => `${l.item_id}|${l.tag_id}`)))
    throw new BackupError('The backup contains duplicate tag links.')
  if (hasDuplicate(t.bookmarks.map((b) => b.id)))
    throw new BackupError('The backup contains duplicate bookmark ids.')
  if (hasDuplicate(t.bookmarks.map((b) => `${b.owner_id}|${b.tool_id}`)))
    throw new BackupError('The backup contains duplicate bookmarks.')

  const projectIds = new Set(t.projects.map((p) => p.id))
  const itemIds = new Set(t.research_items.map((i) => i.id))
  const tagIds = new Set(t.tags.map((tag) => tag.id))

  for (const item of t.research_items) {
    if (item.project_id !== null && !projectIds.has(item.project_id)) {
      throw new BackupError(
        `The item "${item.title}" belongs to a project that is not in the backup.`,
      )
    }
  }
  for (const link of t.research_item_tags) {
    if (!itemIds.has(link.item_id) || !tagIds.has(link.tag_id)) {
      throw new BackupError(
        'A tag link refers to an item or tag that is not in the backup.',
      )
    }
  }
}

/** Turns file text into a validated backup, or throws a BackupError with a readable reason. */
export function parseBackup(text: string): BackupFile {
  let raw: unknown
  try {
    raw = JSON.parse(text)
  } catch {
    throw new BackupError('This file is not valid JSON.')
  }

  if (
    typeof raw !== 'object' ||
    raw === null ||
    (raw as { app?: unknown }).app !== BACKUP_APP_ID
  ) {
    throw new BackupError('This is not a Marketing Workspace backup file.')
  }

  const version = (raw as { format_version?: unknown }).format_version
  if (typeof version !== 'number' || version > BACKUP_FORMAT_VERSION) {
    throw new BackupError(
      'This backup was made by a newer version of the app and cannot be read here.',
    )
  }

  const result = backupSchema.safeParse(raw)
  if (!result.success) {
    throw new BackupError(`The backup file is damaged: ${describeIssues(result.error)}`)
  }

  checkIntegrity(result.data.tables)
  return result.data
}

/**
 * Replaces ALL current user data with the backup, in one transaction.
 * If anything fails, the transaction is rolled back and nothing changes.
 * (Attachments are added to backups in Stage 7.)
 */
export async function restoreBackup(backup: BackupFile): Promise<BackupSummary> {
  const t = backup.tables
  await db.transaction('rw', USER_TABLES(), async () => {
    await db.projects.clear()
    await db.research_items.clear()
    await db.tags.clear()
    await db.research_item_tags.clear()
    await db.bookmarks.clear()

    await db.projects.bulkAdd(t.projects)
    await db.tags.bulkAdd(t.tags)
    await db.research_items.bulkAdd(t.research_items)
    await db.research_item_tags.bulkAdd(t.research_item_tags)
    await db.bookmarks.bulkAdd(t.bookmarks)
  })
  return summarizeBackup(backup)
}