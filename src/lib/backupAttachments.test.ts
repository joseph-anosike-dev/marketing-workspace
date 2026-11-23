import { describe, expect, it } from 'vitest'
import { attachmentsRepo, itemsRepo } from '@/data/repositories'
import { db } from '@/lib/db'
import {
  buildBackup,
  parseBackup,
  restoreBackup,
  summarizeBackup,
  type BackupFile,
} from './backup'
import { blobToBase64 } from './base64'

function pngLike(size = 200): Blob {
  const bytes = new Uint8Array(size)
  for (let i = 0; i < size; i++) bytes[i] = (i * 7) % 256
  return new Blob([bytes], { type: 'image/png' })
}

async function bytesOf(blob: Blob): Promise<number[]> {
  return Array.from(new Uint8Array(await blob.arrayBuffer()))
}

async function wipe() {
  await Promise.all(db.tables.map((table) => table.clear()))
}

async function freshCopy(): Promise<BackupFile> {
  return JSON.parse(JSON.stringify(await buildBackup())) as BackupFile
}

async function seedWithImage() {
  const item = await itemsRepo.create({
    title: 'With image',
    section: 'advertising',
    tags: ['a'],
  })
  const blob = pngLike()
  await attachmentsRepo.apply(item.id, {
    add: [{ file_name: 'shot.png', mime_type: 'image/png', blob }],
    removeIds: [],
  })
  return { item, blob }
}

describe('backups with images', () => {
  it('includes each image as base64 text', async () => {
    const { blob } = await seedWithImage()
    const backup = await buildBackup()

    expect(backup.format_version).toBe(2)
    expect(backup.tables.attachments).toHaveLength(1)
    expect(backup.tables.attachments[0]).toMatchObject({
      file_name: 'shot.png',
      mime_type: 'image/png',
      size_bytes: blob.size,
    })
    expect(backup.tables.attachments[0].data).toBe(await blobToBase64(blob))
    expect(summarizeBackup(backup).attachments).toBe(1)
  })

  it('restores images exactly as they were', async () => {
    const { item, blob } = await seedWithImage()
    const text = JSON.stringify(await buildBackup())
    await wipe()

    const summary = await restoreBackup(parseBackup(text))
    expect(summary.attachments).toBe(1)

    const restored = await attachmentsRepo.listForItem(item.id)
    expect(restored).toHaveLength(1)
    expect(restored[0]).toMatchObject({
      file_name: 'shot.png',
      mime_type: 'image/png',
      size_bytes: blob.size,
    })
    expect(restored[0].blob?.type).toBe('image/png')
    expect(await bytesOf(restored[0].blob as Blob)).toEqual(await bytesOf(blob))
  })

  it('replaces images that were there before the restore', async () => {
    const item = await itemsRepo.create({ title: 'x', section: 'market' })
    const withoutImages = JSON.stringify(await buildBackup())

    await attachmentsRepo.apply(item.id, {
      add: [{ file_name: 'late.png', mime_type: 'image/png', blob: pngLike() }],
      removeIds: [],
    })
    await restoreBackup(parseBackup(withoutImages))

    expect(await db.attachments.count()).toBe(0)
  })

  it('leaves existing images untouched if a restore fails halfway', async () => {
    const { item } = await seedWithImage()
    const bad = await freshCopy()
    // A second tag with the same id makes the database refuse it mid-restore.
    bad.tables.tags.push({ ...bad.tables.tags[0], name: 'other-name' })

    await expect(restoreBackup(bad)).rejects.toThrow()

    expect(await attachmentsRepo.listForItem(item.id)).toHaveLength(1)
  })

  it('still reads old version 1 backups, which have no images', async () => {
    await itemsRepo.create({ title: 'Old', section: 'market' })
    const old = await freshCopy()
    old.format_version = 1
    delete (old.tables as Record<string, unknown>).attachments

    const parsed = parseBackup(JSON.stringify(old))
    expect(parsed.tables.attachments).toEqual([])

    await wipe()
    const summary = await restoreBackup(parsed)
    expect(summary).toMatchObject({ items: 1, attachments: 0 })
  })
})

describe('parseBackup rejects bad images', () => {
  async function expectRejected(mutate: (b: BackupFile) => void, message: RegExp) {
    await seedWithImage()
    const backup = await freshCopy()
    mutate(backup)
    expect(() => parseBackup(JSON.stringify(backup))).toThrow(message)
  }

  it('rejects an image whose finding is missing', async () => {
    await expectRejected((b) => {
      b.tables.attachments[0].item_id = 'ghost'
    }, /not in the backup/)
  })

  it('rejects image data that is not valid base64', async () => {
    await expectRejected((b) => {
      b.tables.attachments[0].data = '!!!!'
    }, /damaged/)
  })

  it('rejects an image whose size does not match its data', async () => {
    await expectRejected((b) => {
      b.tables.attachments[0].size_bytes += 1
    }, /damaged/)
  })

  it('rejects duplicate image ids', async () => {
    await expectRejected((b) => {
      b.tables.attachments.push({ ...b.tables.attachments[0] })
    }, /duplicate attachment ids/)
  })

  it('rejects a type that is not allowed', async () => {
    await expectRejected((b) => {
      b.tables.attachments[0].mime_type = 'image/svg+xml' as never
    }, /mime_type/)
  })
})