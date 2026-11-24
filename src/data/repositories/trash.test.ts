import { afterEach, describe, expect, it, vi } from 'vitest'
import { attachmentsRepo, itemsRepo, projectsRepo, trashRepo } from '@/data/repositories'
import { buildBackup, parseBackup } from '@/lib/backup'
import { db } from '@/lib/db'
import { NotFoundError } from '@/lib/errors'

function png(size = 64) {
  return {
    file_name: 'shot.png',
    mime_type: 'image/png',
    blob: new Blob([new Uint8Array(size).fill(7)], { type: 'image/png' }),
  }
}

async function itemWithImage(title: string, projectId: string | null, size = 64) {
  const item = await itemsRepo.create({
    title,
    section: 'market',
    project_id: projectId,
    tags: ['shared', `only-${title}`],
  })
  await attachmentsRepo.apply(item.id, { add: [png(size)], removeIds: [] })
  return item
}

describe('trash list', () => {
  it('is empty when nothing is deleted', async () => {
    await itemsRepo.create({ title: 'Live', section: 'market' })
    expect(await trashRepo.list()).toEqual({
      projects: [],
      items: [],
      imageCount: 0,
      imageBytes: 0,
    })
  })

  it('shows single findings, and groups findings deleted with their project', async () => {
    const project = await projectsRepo.create({ name: 'Mums' })
    const solo = await itemWithImage('Solo', project.id, 100)
    const together = await itemWithImage('Together', project.id, 50)
    await itemsRepo.remove(solo.id)
    await projectsRepo.remove(project.id, { deleteItems: true })

    const trash = await trashRepo.list()
    expect(trash.projects).toHaveLength(1)
    expect(trash.projects[0]).toMatchObject({ itemCount: 1, imageCount: 1, imageBytes: 50 })
    expect(trash.items.map((r) => r.item.id)).toEqual([solo.id])
    expect(trash.items[0]).toMatchObject({
      projectName: 'Mums',
      projectInTrash: true,
      imageBytes: 100,
    })
    expect(trash.imageCount).toBe(2)
    expect(trash.imageBytes).toBe(150)
    expect(together.id).toBeTruthy()
  })
})

describe('restoring', () => {
  it('restores a finding into its project', async () => {
    const project = await projectsRepo.create({ name: 'P' })
    const item = await itemsRepo.create({ title: 'A', section: 'market', project_id: project.id })
    await itemsRepo.remove(item.id)

    expect(await trashRepo.restoreItem(item.id)).toEqual({ movedToVault: false })
    expect((await itemsRepo.get(item.id))?.project_id).toBe(project.id)
    expect((await trashRepo.list()).items).toHaveLength(0)
  })

  it('moves a finding to the Vault when its project is in Trash', async () => {
    const project = await projectsRepo.create({ name: 'P' })
    const item = await itemsRepo.create({ title: 'A', section: 'market', project_id: project.id })
    await itemsRepo.remove(item.id)
    await projectsRepo.remove(project.id)

    expect(await trashRepo.restoreItem(item.id)).toEqual({ movedToVault: true })
    expect((await itemsRepo.get(item.id))?.project_id).toBeNull()
  })

  it('restores a project with only the findings deleted together with it', async () => {
    const project = await projectsRepo.create({ name: 'P' })
    const early = await itemsRepo.create({ title: 'Early', section: 'market', project_id: project.id })
    const late = await itemsRepo.create({ title: 'Late', section: 'market', project_id: project.id })
    await itemsRepo.remove(early.id)
    await projectsRepo.remove(project.id, { deleteItems: true })

    expect(await trashRepo.restoreProject(project.id)).toEqual({ restoredItems: 1 })
    expect(await projectsRepo.get(project.id)).toBeDefined()
    expect(await itemsRepo.get(late.id)).toBeDefined()
    expect(await itemsRepo.get(early.id)).toBeUndefined()
    expect((await trashRepo.list()).items.map((r) => r.item.id)).toEqual([early.id])
  })

  it('refuses to restore things that are not in Trash', async () => {
    const live = await itemsRepo.create({ title: 'Live', section: 'market' })
    const project = await projectsRepo.create({ name: 'P' })
    await expect(trashRepo.restoreItem(live.id)).rejects.toBeInstanceOf(NotFoundError)
    await expect(trashRepo.restoreProject(project.id)).rejects.toBeInstanceOf(NotFoundError)
  })
})

describe('deleting for good', () => {
  it('removes a finding, its images and tag links, and keeps shared tags', async () => {
    const keep = await itemWithImage('Keep', null)
    const gone = await itemWithImage('Gone', null)
    await itemsRepo.remove(gone.id)

    await trashRepo.purgeItem(gone.id)

    expect(await db.research_items.get(gone.id)).toBeUndefined()
    expect(await db.attachments.where('item_id').equals(gone.id).count()).toBe(0)
    expect(await db.research_item_tags.where('item_id').equals(gone.id).count()).toBe(0)
    const names = (await db.tags.toArray()).map((t) => t.name).sort()
    expect(names).toEqual(['only-keep', 'shared'])
    expect(await db.attachments.where('item_id').equals(keep.id).count()).toBe(1)
  })

  it('refuses to delete a finding or project that is not in Trash', async () => {
    const live = await itemsRepo.create({ title: 'Live', section: 'market' })
    const project = await projectsRepo.create({ name: 'P' })
    await expect(trashRepo.purgeItem(live.id)).rejects.toBeInstanceOf(NotFoundError)
    await expect(trashRepo.purgeProject(project.id)).rejects.toBeInstanceOf(NotFoundError)
    expect(await itemsRepo.get(live.id)).toBeDefined()
    expect(await projectsRepo.get(project.id)).toBeDefined()
  })

  it('deletes a project with its findings and leaves a valid backup', async () => {
    const project = await projectsRepo.create({ name: 'P' })
    const early = await itemWithImage('Early', project.id)
    const late = await itemWithImage('Late', project.id)
    await itemsRepo.remove(early.id)
    await projectsRepo.remove(project.id, { deleteItems: true })

    await trashRepo.purgeProject(project.id)

    expect(await db.projects.get(project.id)).toBeUndefined()
    expect(await db.research_items.get(late.id)).toBeUndefined()
    expect(await db.attachments.where('item_id').equals(late.id).count()).toBe(0)
    // The finding deleted earlier stays in Trash, no longer tied to the project.
    expect((await db.research_items.get(early.id))?.project_id).toBeNull()
    expect((await trashRepo.list()).items.map((r) => r.item.id)).toEqual([early.id])

    const backup = JSON.parse(JSON.stringify(await buildBackup()))
    expect(() => parseBackup(JSON.stringify(backup))).not.toThrow()
  })

  it('empties Trash and leaves live data alone', async () => {
    const project = await projectsRepo.create({ name: 'P' })
    const live = await itemWithImage('Live', null)
    const gone = await itemWithImage('Gone', project.id)
    await itemsRepo.remove(gone.id)
    await projectsRepo.remove(project.id)

    expect(await trashRepo.empty()).toEqual({ projects: 1, items: 1 })

    expect(await trashRepo.list()).toMatchObject({ projects: [], items: [], imageBytes: 0 })
    expect(await itemsRepo.get(live.id)).toBeDefined()
    expect(await db.attachments.where('item_id').equals(live.id).count()).toBe(1)
    expect(await db.projects.count()).toBe(0)
  })
})

describe('deleted together versus deleted earlier', () => {
  afterEach(() => {
    vi.useRealTimers()
  })

  it('keeps them apart even when both deletions happen in the same millisecond', async () => {
    vi.useFakeTimers({ toFake: ['Date'] })
    vi.setSystemTime(new Date('2026-11-24T12:00:00.000Z'))

    const project = await projectsRepo.create({ name: 'P' })
    const early = await itemsRepo.create({ title: 'Early', section: 'market', project_id: project.id })
    await itemsRepo.create({ title: 'Late', section: 'market', project_id: project.id })
    await itemsRepo.remove(early.id)
    await projectsRepo.remove(project.id, { deleteItems: true })

    const trash = await trashRepo.list()
    expect(trash.projects[0]).toMatchObject({ itemCount: 1 })
    expect(trash.items.map((r) => r.item.id)).toEqual([early.id])
  })
})
