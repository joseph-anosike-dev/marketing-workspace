import { describe, expect, it } from 'vitest'
import { attachmentsRepo, itemsRepo } from '@/data/repositories'
import type { NewAttachment } from '@/data/repositories/attachment-types'
import { db } from '@/lib/db'
import { NotFoundError } from '@/lib/errors'
import { MAX_ATTACHMENTS_PER_ITEM, MAX_STORED_BYTES } from '@/lib/images'

function image(name = 'shot.png', size = 64, type = 'image/png'): NewAttachment {
  const bytes = new Uint8Array(size)
  for (let i = 0; i < size; i++) bytes[i] = i % 251
  return { file_name: name, mime_type: type, blob: new Blob([bytes], { type }) }
}

async function newItem(title = 'x') {
  return itemsRepo.create({ title, section: 'market' })
}

describe('adding images', () => {
  it('stores images and lists them in the order they were added', async () => {
    const item = await newItem()
    const result = await attachmentsRepo.apply(item.id, {
      add: [image('a.png'), image('b.png'), image('c.png')],
      removeIds: [],
    })

    expect(result.map((a) => a.file_name)).toEqual(['a.png', 'b.png', 'c.png'])

    const listed = await attachmentsRepo.listForItem(item.id)
    expect(listed.map((a) => a.file_name)).toEqual(['a.png', 'b.png', 'c.png'])
    expect(listed[0]).toMatchObject({
      item_id: item.id,
      mime_type: 'image/png',
      size_bytes: 64,
      storage_path: null,
    })
    expect(listed[0].owner_id).toBeTruthy()
    expect(listed[0].blob?.size).toBe(64)
  })

  it('cleans the file name', async () => {
    const item = await newItem()
    const [saved] = await attachmentsRepo.apply(item.id, {
      add: [image('../x/shot.png')],
      removeIds: [],
    })
    expect(saved.file_name).toBe('shot.png')
  })

  it('stores the recorded type even if the file arrived without one', async () => {
    const item = await newItem()
    const [saved] = await attachmentsRepo.apply(item.id, {
      add: [
        {
          file_name: 'a.png',
          mime_type: 'image/png',
          blob: new Blob([new Uint8Array(10)]),
        },
      ],
      removeIds: [],
    })
    expect(saved.blob?.type).toBe('image/png')
  })

  it('counts a change to the images as an update to the finding', async () => {
    const item = await newItem()
    await new Promise((resolve) => setTimeout(resolve, 5))
    await attachmentsRepo.apply(item.id, { add: [image()], removeIds: [] })
    const reloaded = await itemsRepo.get(item.id)
    expect(reloaded?.updated_at).not.toBe(item.updated_at)
  })
})

describe('rejecting bad images', () => {
  it('rejects types that are not allowed, such as SVG', async () => {
    const item = await newItem()
    await expect(
      attachmentsRepo.apply(item.id, {
        add: [image('x.svg', 10, 'image/svg+xml')],
        removeIds: [],
      }),
    ).rejects.toThrow(/PNG, JPEG, WebP and GIF/)
  })

  it('rejects empty files', async () => {
    const item = await newItem()
    await expect(
      attachmentsRepo.apply(item.id, {
        add: [{ file_name: 'a.png', mime_type: 'image/png', blob: new Blob([]) }],
        removeIds: [],
      }),
    ).rejects.toThrow(/empty/)
  })

  it('rejects files over the size limit', async () => {
    const item = await newItem()
    const big: NewAttachment = {
      file_name: 'big.png',
      mime_type: 'image/png',
      blob: new Blob([new Uint8Array(MAX_STORED_BYTES + 1)], { type: 'image/png' }),
    }
    await expect(
      attachmentsRepo.apply(item.id, { add: [big], removeIds: [] }),
    ).rejects.toThrow(/too large/)
  })

  it('saves nothing when one file in a batch is bad', async () => {
    const item = await newItem()
    await expect(
      attachmentsRepo.apply(item.id, {
        add: [image('good.png'), image('bad.svg', 10, 'image/svg+xml')],
        removeIds: [],
      }),
    ).rejects.toThrow()
    expect(await db.attachments.count()).toBe(0)
  })

  it('refuses images for a finding that does not exist or was deleted', async () => {
    await expect(
      attachmentsRepo.apply('ghost', { add: [image()], removeIds: [] }),
    ).rejects.toBeInstanceOf(NotFoundError)

    const item = await newItem()
    await itemsRepo.remove(item.id)
    await expect(
      attachmentsRepo.apply(item.id, { add: [image()], removeIds: [] }),
    ).rejects.toBeInstanceOf(NotFoundError)
  })
})

describe('the image limit per finding', () => {
  it('allows the maximum and refuses one more, saving nothing extra', async () => {
    const item = await newItem()
    const first = await attachmentsRepo.apply(item.id, {
      add: Array.from({ length: MAX_ATTACHMENTS_PER_ITEM }, (_, i) => image(`${i}.png`)),
      removeIds: [],
    })
    expect(first).toHaveLength(MAX_ATTACHMENTS_PER_ITEM)

    await expect(
      attachmentsRepo.apply(item.id, { add: [image('extra.png')], removeIds: [] }),
    ).rejects.toThrow(/at most 10 images/)
    expect(await db.attachments.count()).toBe(MAX_ATTACHMENTS_PER_ITEM)
  })

  it('lets you swap an image when the finding is full', async () => {
    const item = await newItem()
    const first = await attachmentsRepo.apply(item.id, {
      add: Array.from({ length: MAX_ATTACHMENTS_PER_ITEM }, (_, i) => image(`${i}.png`)),
      removeIds: [],
    })

    const after = await attachmentsRepo.apply(item.id, {
      add: [image('new.png')],
      removeIds: [first[0].id],
    })
    expect(after).toHaveLength(MAX_ATTACHMENTS_PER_ITEM)
    expect(after.map((a) => a.file_name)).toContain('new.png')
    expect(after.map((a) => a.file_name)).not.toContain('0.png')
  })
})

describe('removing images', () => {
  it('removes the chosen images only', async () => {
    const item = await newItem()
    const added = await attachmentsRepo.apply(item.id, {
      add: [image('a.png'), image('b.png')],
      removeIds: [],
    })
    const after = await attachmentsRepo.apply(item.id, {
      add: [],
      removeIds: [added[0].id],
    })
    expect(after.map((a) => a.file_name)).toEqual(['b.png'])
    expect(await db.attachments.count()).toBe(1)
  })

  it('ignores ids that belong to another finding', async () => {
    const a = await newItem('a')
    const b = await newItem('b')
    const [onB] = await attachmentsRepo.apply(b.id, { add: [image()], removeIds: [] })

    await attachmentsRepo.apply(a.id, { add: [], removeIds: [onB.id] })

    expect(await attachmentsRepo.listForItem(b.id)).toHaveLength(1)
  })

  it('keeps images when a finding is soft-deleted', async () => {
    const item = await newItem()
    await attachmentsRepo.apply(item.id, { add: [image()], removeIds: [] })
    await itemsRepo.remove(item.id)
    expect(await db.attachments.count()).toBe(1)
  })
})

describe('listForItems', () => {
  it('groups images by finding and leaves out findings with none', async () => {
    const a = await newItem('a')
    const b = await newItem('b')
    const c = await newItem('c')
    await attachmentsRepo.apply(a.id, { add: [image('1.png'), image('2.png')], removeIds: [] })
    await attachmentsRepo.apply(b.id, { add: [image('3.png')], removeIds: [] })

    const map = await attachmentsRepo.listForItems([a.id, b.id, c.id])

    expect(map.get(a.id)?.map((x) => x.file_name)).toEqual(['1.png', '2.png'])
    expect(map.get(b.id)?.map((x) => x.file_name)).toEqual(['3.png'])
    expect(map.has(c.id)).toBe(false)
  })

  it('returns an empty map for no ids', async () => {
    expect((await attachmentsRepo.listForItems([])).size).toBe(0)
  })
})