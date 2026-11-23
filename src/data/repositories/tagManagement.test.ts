import { describe, expect, it } from 'vitest'
import { itemsRepo, tagsRepo } from '@/data/repositories'
import { db } from '@/lib/db'
import { NotFoundError } from '@/lib/errors'

async function tagId(name: string): Promise<string> {
  const tag = (await tagsRepo.list()).find((t) => t.name === name)
  if (!tag) throw new Error(`No tag named ${name}`)
  return tag.id
}

describe('renaming tags', () => {
  it('renames a tag on every finding and cleans up the new name', async () => {
    const a = await itemsRepo.create({ title: 'a', section: 'market', tags: ['old'] })
    const b = await itemsRepo.create({ title: 'b', section: 'market', tags: ['old'] })

    const result = await tagsRepo.rename(await tagId('old'), 'New Name')

    expect(result).toEqual({ name: 'new-name', merged: false })
    expect((await itemsRepo.get(a.id))?.tags).toEqual(['new-name'])
    expect((await itemsRepo.get(b.id))?.tags).toEqual(['new-name'])
  })

  it('merges into an existing tag without double-tagging anything', async () => {
    const both = await itemsRepo.create({
      title: 'both',
      section: 'market',
      tags: ['alpha', 'beta'],
    })
    const onlyAlpha = await itemsRepo.create({
      title: 'alpha only',
      section: 'market',
      tags: ['alpha'],
    })
    const onlyBeta = await itemsRepo.create({
      title: 'beta only',
      section: 'market',
      tags: ['beta'],
    })

    const result = await tagsRepo.rename(await tagId('beta'), 'alpha')

    expect(result).toEqual({ name: 'alpha', merged: true })
    expect((await itemsRepo.get(both.id))?.tags).toEqual(['alpha'])
    expect((await itemsRepo.get(onlyAlpha.id))?.tags).toEqual(['alpha'])
    expect((await itemsRepo.get(onlyBeta.id))?.tags).toEqual(['alpha'])

    const summary = (await tagsRepo.list()).map((t) => [t.name, t.count])
    expect(summary).toEqual([['alpha', 3]])
    expect(await db.tags.count()).toBe(1)
    expect(await db.research_item_tags.count()).toBe(3)
  })

  it('does nothing when the name does not change', async () => {
    await itemsRepo.create({ title: 'x', section: 'market', tags: ['same'] })
    const result = await tagsRepo.rename(await tagId('same'), 'Same')
    expect(result).toEqual({ name: 'same', merged: false })
  })

  it('rejects an empty or too-long name', async () => {
    await itemsRepo.create({ title: 'x', section: 'market', tags: ['keep'] })
    const id = await tagId('keep')
    await expect(tagsRepo.rename(id, '   ')).rejects.toThrow(/tag name/i)
    await expect(tagsRepo.rename(id, '!!!')).rejects.toThrow(/tag name/i)
    await expect(tagsRepo.rename(id, 'x'.repeat(61))).rejects.toThrow(/60 characters/)
    expect((await tagsRepo.list()).map((t) => t.name)).toEqual(['keep'])
  })

  it('throws NotFoundError for an unknown tag', async () => {
    await expect(tagsRepo.rename('ghost', 'x')).rejects.toBeInstanceOf(NotFoundError)
  })
})

describe('removing tags', () => {
  it('takes the tag off every finding but keeps the findings', async () => {
    const item = await itemsRepo.create({
      title: 'x',
      section: 'market',
      tags: ['a', 'b'],
    })

    await tagsRepo.remove(await tagId('a'))

    expect((await itemsRepo.get(item.id))?.tags).toEqual(['b'])
    expect(await db.tags.count()).toBe(1)
    expect(await db.research_item_tags.count()).toBe(1)
  })

  it('throws NotFoundError for an unknown tag', async () => {
    await expect(tagsRepo.remove('ghost')).rejects.toBeInstanceOf(NotFoundError)
  })
})