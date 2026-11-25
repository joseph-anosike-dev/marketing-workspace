import { z } from 'zod'
import { base64ToBlob, blobToBase64, decodedByteLength, isValidBase64 } from '@/lib/base64'
import { db } from '@/lib/db'
import { nowIso } from '@/lib/ids'
import { ALLOWED_IMAGE_TYPES, MAX_STORED_BYTES, isAllowedImageType } from '@/lib/images'
import { ITEM_KINDS, PROJECT_STATUSES, SECTIONS, type Attachment } from '@/types'

export const BACKUP_APP_ID = 'marketing-workspace'
// Version 2 added attachments. Version 1 files can still be restored.
export const BACKUP_FORMAT_VERSION = 2

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

// Images travel inside the backup as base64 text in "data".
const attachmentRecord = z.object({
  id: z.string().min(1),
  owner_id: z.string().min(1),
  item_id: z.string().min(1),
  file_name: z.string().min(1).max(200),
  mime_type: z.enum(ALLOWED_IMAGE_TYPES),
  size_bytes: z.number().int().nonnegative().max(MAX_STORED_BYTES),
  created_at: timestamp,
  data: z.string().min(1),
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
    // Missing in version 1 backups, which had no images.
    attachments: z.array(attachmentRecord).default([]),
  }),
})

export type BackupFile = z.infer<typeof backupSchema>
type BackupTables = BackupFile['tables']

export interface BackupSummary {
  projects: number
  items: number
  tags: number
  bookmarks: number
  attachments: number
}

/** Counts what a user would recognise: live projects, findings and their images. */
export function summarizeBackup(backup: BackupFile): BackupSummary {
  const t = backup.tables
  const liveItemIds = new Set(
    t.research_items.filter((i) => !i.deleted_at).map((i) => i.id),
  )
  return {
    projects: t.projects.filter((p) => !p.deleted_at).length,
    items: liveItemIds.size,
    tags: t.tags.length,
    bookmarks: t.bookmarks.length,
    attachments: t.attachments.filter((a) => liveItemIds.has(a.item_id)).length,
  }
}

const USER_TABLES = () => [
  db.projects,
  db.research_items,
  db.tags,
  db.research_item_tags,
  db.bookmarks,
  db.attachments,
]

async function toBackupAttachment(
  attachment: Attachment,
): Promise<BackupTables['attachments'][number]> {
  const mime = attachment.mime_type
  if (!attachment.blob || !isAllowedImageType(mime)) {
    throw new Error(`The image "${attachment.file_name}" cannot be included in a backup.`)
  }
  return {
    id: attachment.id,
    owner_id: attachment.owner_id,
    item_id: attachment.item_id,
    file_name: attachment.file_name,
    mime_type: mime,
    size_bytes: attachment.blob.size,
    created_at: attachment.created_at,
    data: await blobToBase64(attachment.blob),
  }
}

/** Reads all user data in one consistent snapshot. Deleted records are included. */
export async function buildBackup(): Promise<BackupFile> {
  // Only database reads inside the transaction; the slower image encoding
  // happens afterwards so the transaction is never left waiting.
  const snapshot = await db.transaction('r', USER_TABLES(), async () => {
    const [
      projects,
      research_items,
      tags,
      research_item_tags,
      bookmarks,
      attachments,
    ] = await Promise.all([
      db.projects.toArray(),
      db.research_items.toArray(),
      db.tags.toArray(),
      db.research_item_tags.toArray(),
      db.bookmarks.toArray(),
      db.attachments.toArray(),
    ])
    return {
      projects,
      research_items,
      tags,
      research_item_tags,
      bookmarks,
      attachments,
    }
  })

  const itemIds = new Set(snapshot.research_items.map((i) => i.id))
  const attachments: BackupTables['attachments'] = []
  for (const attachment of snapshot.attachments) {
    if (itemIds.has(attachment.item_id)) {
      attachments.push(await toBackupAttachment(attachment))
    }
  }

  return {
    app: BACKUP_APP_ID,
    format_version: BACKUP_FORMAT_VERSION,
    exported_at: nowIso(),
    tables: {
      projects: snapshot.projects,
      research_items: snapshot.research_items,
      tags: snapshot.tags,
      research_item_tags: snapshot.research_item_tags,
      bookmarks: snapshot.bookmarks,
      attachments,
    },
  }
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
  if (hasDuplicate(t.attachments.map((a) => a.id)))
    throw new BackupError('The backup contains duplicate attachment ids.')

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
  for (const attachment of t.attachments) {
    if (!itemIds.has(attachment.item_id)) {
      throw new BackupError(
        `The image "${attachment.file_name}" belongs to a finding that is not in the backup.`,
      )
    }
    if (
      !isValidBase64(attachment.data) ||
      decodedByteLength(attachment.data) !== attachment.size_bytes
    ) {
      throw new BackupError(`The image "${attachment.file_name}" is damaged.`)
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
    throw new BackupError('This is not a Re-Search backup file.')
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
 */
export async function restoreBackup(backup: BackupFile): Promise<BackupSummary> {
  const t = backup.tables

  // Decode the images before the transaction starts.
  const attachmentRows: Attachment[] = t.attachments.map((a) => ({
    id: a.id,
    owner_id: a.owner_id,
    item_id: a.item_id,
    file_name: a.file_name,
    mime_type: a.mime_type,
    size_bytes: a.size_bytes,
    blob: base64ToBlob(a.data, a.mime_type),
    storage_path: null,
    created_at: a.created_at,
  }))

  await db.transaction('rw', USER_TABLES(), async () => {
    await db.projects.clear()
    await db.research_items.clear()
    await db.tags.clear()
    await db.research_item_tags.clear()
    await db.bookmarks.clear()
    await db.attachments.clear()

    await db.projects.bulkAdd(t.projects)
    await db.tags.bulkAdd(t.tags)
    await db.research_items.bulkAdd(t.research_items)
    await db.research_item_tags.bulkAdd(t.research_item_tags)
    await db.bookmarks.bulkAdd(t.bookmarks)
    await db.attachments.bulkAdd(attachmentRows)
  })
  return summarizeBackup(backup)
}

/**
 * Erases ALL user data (projects, findings, tags, images, bookmarks) in one
 * transaction. The built-in tools directory is reference data and is kept.
 */
export async function wipeUserData(): Promise<void> {
  await db.transaction('rw', USER_TABLES(), async () => {
    await db.projects.clear()
    await db.research_items.clear()
    await db.tags.clear()
    await db.research_item_tags.clear()
    await db.bookmarks.clear()
    await db.attachments.clear()
  })
}
