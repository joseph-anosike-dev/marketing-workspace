import { db } from '@/lib/db'
import { NotFoundError } from '@/lib/errors'
import { newId, nowIso } from '@/lib/ids'
import {
  MAX_ATTACHMENTS_PER_ITEM,
  MAX_STORED_BYTES,
  cleanFileName,
  formatBytes,
  isAllowedImageType,
} from '@/lib/images'
import { getCurrentUserId } from '@/services/access'
import type { Attachment } from '@/types'
import type { AttachmentRepository, NewAttachment } from '../attachment-types'

function sortByCreated(rows: Attachment[]): Attachment[] {
  return [...rows].sort((a, b) => a.created_at.localeCompare(b.created_at))
}

/** Checks one file and returns a cleaned copy. Throws a readable error if it is not acceptable. */
function validate(file: NewAttachment): NewAttachment {
  const name = cleanFileName(file.file_name)
  if (!isAllowedImageType(file.mime_type)) {
    throw new Error('Only PNG, JPEG, WebP and GIF images can be attached.')
  }
  if (file.blob.size === 0) throw new Error(`“${name}” is empty.`)
  if (file.blob.size > MAX_STORED_BYTES) {
    throw new Error(
      `“${name}” is too large (limit ${formatBytes(MAX_STORED_BYTES)}).`,
    )
  }
  // Make sure the stored file carries the same type we recorded.
  const blob =
    file.blob.type === file.mime_type
      ? file.blob
      : file.blob.slice(0, file.blob.size, file.mime_type)
  return { file_name: name, mime_type: file.mime_type, blob }
}

async function listForItem(itemId: string): Promise<Attachment[]> {
  return sortByCreated(await db.attachments.where('item_id').equals(itemId).toArray())
}

async function listForItems(itemIds: string[]): Promise<Map<string, Attachment[]>> {
  const rows = await db.attachments.where('item_id').anyOf(itemIds).toArray()
  const byItem = new Map<string, Attachment[]>()
  for (const row of sortByCreated(rows)) {
    const list = byItem.get(row.item_id) ?? []
    list.push(row)
    byItem.set(row.item_id, list)
  }
  return byItem
}

async function apply(
  itemId: string,
  changes: Parameters<AttachmentRepository['apply']>[1],
): Promise<Attachment[]> {
  // Check every file first, so one bad file means nothing is saved.
  const valid = changes.add.map(validate)
  const toRemove = new Set(changes.removeIds)

  return db.transaction('rw', [db.attachments, db.research_items], async () => {
    const item = await db.research_items.get(itemId)
    if (!item || item.deleted_at) throw new NotFoundError('Research item', itemId)

    const existing = await db.attachments.where('item_id').equals(itemId).toArray()
    const removable = existing.filter((a) => toRemove.has(a.id))
    const kept = existing.filter((a) => !toRemove.has(a.id))

    if (kept.length + valid.length > MAX_ATTACHMENTS_PER_ITEM) {
      throw new Error(
        `A finding can have at most ${MAX_ATTACHMENTS_PER_ITEM} images.`,
      )
    }

    if (removable.length === 0 && valid.length === 0) return sortByCreated(existing)

    const base = Date.now()
    const rows: Attachment[] = valid.map((file, index) => ({
      id: newId(),
      owner_id: getCurrentUserId(),
      item_id: itemId,
      file_name: file.file_name,
      mime_type: file.mime_type,
      size_bytes: file.blob.size,
      blob: file.blob,
      storage_path: null,
      // One millisecond apart, so images keep the order they were added in.
      created_at: new Date(base + index).toISOString(),
    }))

    await db.attachments.bulkDelete(removable.map((a) => a.id))
    await db.attachments.bulkAdd(rows)
    // Changing the images counts as changing the finding.
    await db.research_items.update(itemId, { updated_at: nowIso() })

    return sortByCreated([...kept, ...rows])
  })
}

export const localAttachments: AttachmentRepository = {
  listForItem,
  listForItems,
  apply,
}