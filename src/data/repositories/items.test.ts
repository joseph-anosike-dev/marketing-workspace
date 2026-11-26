import { describe, expect, it } from 'vitest'
import { itemsRepo, projectsRepo } from '@/data/repositories'

describe('count', () => {
  it('always agrees with list().length, including archived and deleted things', async () => {
    const live = await projectsRepo.create({ name: 'Live' })
    const old = await projectsRepo.create({ name: 'Old' })
    await itemsRepo.create({ title: 'a', section: 'market', project_id: live.id })
    await itemsRepo.create({ title: 'b', section: 'market', project_id: old.id })
    await itemsRepo.create({ title: 'c', section: 'market' })
    const gone = await itemsRepo.create({ title: 'd', section: 'market' })
    await itemsRepo.remove(gone.id)
    await projectsRepo.update(old.id, { status: 'archived' })

    expect(await itemsRepo.count()).toBe(2)
    expect(await itemsRepo.count({ includeArchived: true })).toBe(3)
    expect(await itemsRepo.count()).toBe((await itemsRepo.list()).length)
    expect(await itemsRepo.count({ includeArchived: true })).toBe(
      (await itemsRepo.list({ includeArchived: true })).length,
    )
  })

  it('is zero when there is nothing', async () => {
    expect(await itemsRepo.count()).toBe(0)
  })
})
