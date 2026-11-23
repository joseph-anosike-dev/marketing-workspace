import type { Attachment } from '@/types'

export interface NewAttachment {
  file_name: string
  mime_type: string
  blob: Blob
}

export interface AttachmentChanges {
  add: NewAttachment[]
  /** Ids to delete. Ids that belong to other findings are ignored. */
  removeIds: string[]
}

export interface AttachmentRepository {
  listForItem(itemId: string): Promise<Attachment[]>
  /** Findings with no images are simply missing from the map. */
  listForItems(itemIds: string[]): Promise<Map<string, Attachment[]>>
  /**
   * Adds and removes images for one finding in a single all-or-nothing step.
   * Returns the finding's images afterwards, in the order they were added.
   */
  apply(itemId: string, changes: AttachmentChanges): Promise<Attachment[]>
}