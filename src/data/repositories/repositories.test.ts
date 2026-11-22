import { describe, expect, it } from 'vitest'
import { itemsRepo, projectsRepo, tagsRepo } from '@/data/repositories'
import { db } from '@/lib/db'
import { NotFoundError } from '@/lib/errors'

describe('projects', () => {
  it('creates a project with defaults and trims the name', async () => {
    const project = await projectsRepo.create({ name: '  Mums  ' })
    expect(project.name).toBe('Mums')
    expect(project).toMatchObject({
      description: '',
      status: 'active',
      deleted_at: null,
    })
    expect(project.owner_id).toBeTruthy()
    expect(await projectsRepo.get(project.id)).toEqual(project)
  })

  it('rejects an empty name and stores nothing', async () => {
    await expect(projectsRepo.create({ name: '   ' })).rejects.toThrow()
    expect(await projectsRepo.list()).toHaveLength(0)
  })

  it('leaves other fields alone when updating one', async () => {
    const project = await projectsRepo.create({ name: 'A', description: 'keep me' })
    const updated = await projectsRepo.update(project.id, { name: 'B' })
    expect(updated).toMatchObject({
      name: 'B',
      description: 'keep me',
      status: 'active',
    })
  })

  it('throws NotFoundError when updating a missing project', async () => {
    await expect(projectsRepo.update('nope', { name: 'x' })).rejects.toBeInstanceOf(
      NotFoundError,
    )
  })

  it('hides archived projects unless asked', async () => {
    const a = await projectsRepo.create({ name: 'A' })
    await projectsRepo.create({ name: 'B' })
    await projectsRepo.update(a.id, { status: 'archived' })

    expect((await projectsRepo.list()).map((p) => p.name)).toEqual(['B'])
    expect(await projectsRepo.list({ includeArchived: true })).toHaveLength(2)
  })

  it('can delete a project and keep its items in the Vault', async () => {
    const project = await projectsRepo.create({ name: 'P' })
    const item = await itemsRepo.create({
      title: 'x',
      section: 'market',
      project_id: project.id,
    })

    await projectsRepo.remove(project.id)

    expect(await projectsRepo.get(project.id)).toBeUndefined()
    expect((await itemsRepo.get(item.id))?.project_id).toBeNull()
  })

  it('can delete a project together with its items', async () => {
    const project = await projectsRepo.create({ name: 'P' })
    const item = await itemsRepo.create({
      title: 'x',
      section: 'market',
      project_id: project.id,
    })

    await projectsRepo.remove(project.id, { deleteItems: true })

    expect(await itemsRepo.get(item.id)).toBeUndefined()
  })

  it('throws when deleting a project twice', async () => {
    const project = await projectsRepo.create({ name: 'P' })
    await projectsRepo.remove(project.id)
    await expect(projectsRepo.remove(project.id)).rejects.toBeInstanceOf(NotFoundError)
  })
})

describe('research items', () => {
  it('cleans and de-duplicates tags', async () => {
    const item = await itemsRepo.create({
      title: 'T',
      section: 'customer',
      tags: ['Baby Sleep', '#baby sleep', 'Sleep'],
    })
    expect(item.tags).toEqual(['baby-sleep', 'sleep'])
  })

  it('refuses an item for a missing project and leaves no trace', async () => {
    await expect(
      itemsRepo.create({
        title: 'x',
        section: 'market',
        project_id: 'missing',
        tags: ['a'],
      }),
    ).rejects.toBeInstanceOf(NotFoundError)

    expect(await db.research_items.count()).toBe(0)
    expect(await db.tags.count()).toBe(0)
  })

  it('rejects a script address as the source URL', async () => {
    await expect(
      itemsRepo.create({
        title: 'x',
        section: 'market',
        source_url: 'javascript:alert(1)',
      }),
    ).rejects.toThrow()
  })

  it('stores an empty URL as null', async () => {
    const item = await itemsRepo.create({
      title: 'x',
      section: 'market',
      source_url: '',
    })
    expect(item.source_url).toBeNull()
  })

  it('replaces tags on update, and keeps them when tags are not passed', async () => {
    const item = await itemsRepo.create({
      title: 'x',
      section: 'market',
      tags: ['a', 'b'],
    })

    const renamed = await itemsRepo.update(item.id, { title: 'y' })
    expect(renamed.tags).toEqual(['a', 'b'])

    const retagged = await itemsRepo.update(item.id, { tags: ['b', 'c'] })
    expect(retagged.tags).toEqual(['b', 'c'])
  })

  it('filters by section, project and tag', async () => {
    const project = await projectsRepo.create({ name: 'P' })
    await itemsRepo.create({
      title: 'In project',
      section: 'market',
      project_id: project.id,
      tags: ['Parenting'],
    })
    await itemsRepo.create({ title: 'Loose', section: 'keyword' })

    const titles = async (filter: Parameters<typeof itemsRepo.list>[0]) =>
      (await itemsRepo.list(filter)).map((i) => i.title)

    expect(await titles({ section: 'keyword' })).toEqual(['Loose'])
    expect(await titles({ projectId: project.id })).toEqual(['In project'])
    expect(await titles({ projectId: null })).toEqual(['Loose'])
    expect(await titles({ tag: 'parenting' })).toEqual(['In project'])
  })

  it('searches title, notes, URL and tags, ignoring case', async () => {
    await itemsRepo.create({
      title: 'Baby sleep guide',
      body: 'newborn routines',
      source_url: 'https://example.com/sleep',
      section: 'market',
      tags: ['parenting'],
    })
    await itemsRepo.create({ title: 'Pricing page', section: 'competitor' })

    const hits = async (search: string) =>
      (await itemsRepo.list({ search })).map((i) => i.title)

    expect(await hits('BABY')).toEqual(['Baby sleep guide'])
    expect(await hits('newborn')).toEqual(['Baby sleep guide'])
    expect(await hits('example.com')).toEqual(['Baby sleep guide'])
    expect(await hits('parenting')).toEqual(['Baby sleep guide'])
    expect(await hits('zzz')).toEqual([])
  })

  it('soft-deletes: hidden from the app but the row remains', async () => {
    const item = await itemsRepo.create({ title: 'x', section: 'market' })
    await itemsRepo.remove(item.id)

    expect(await itemsRepo.get(item.id)).toBeUndefined()
    expect(await itemsRepo.list()).toHaveLength(0)
    expect((await db.research_items.get(item.id))?.deleted_at).toBeTruthy()
  })
})

describe('archived projects hide their items', () => {
  async function setup() {
    const project = await projectsRepo.create({ name: 'Shelved' })
    await itemsRepo.create({
      title: 'Inside',
      section: 'market',
      project_id: project.id,
      tags: ['shared'],
    })
    await itemsRepo.create({ title: 'Outside', section: 'market', tags: ['shared'] })
    return project
  }

  const titles = async (filter?: Parameters<typeof itemsRepo.list>[0]) =>
    (await itemsRepo.list(filter)).map((i) => i.title).sort()

  it('hides them from the Vault by default', async () => {
    const project = await setup()
    await projectsRepo.update(project.id, { status: 'archived' })
    expect(await titles()).toEqual(['Outside'])
  })

  it('shows them when includeArchived is true', async () => {
    const project = await setup()
    await projectsRepo.update(project.id, { status: 'archived' })
    expect(await titles({ includeArchived: true })).toEqual(['Inside', 'Outside'])
  })

  it('still shows them when the archived project is opened directly', async () => {
    const project = await setup()
    await projectsRepo.update(project.id, { status: 'archived' })
    expect(await titles({ projectId: project.id })).toEqual(['Inside'])
  })

  it('brings them back when the project is restored', async () => {
    const project = await setup()
    await projectsRepo.update(project.id, { status: 'archived' })
    await projectsRepo.update(project.id, { status: 'active' })
    expect(await titles()).toEqual(['Inside', 'Outside'])
  })

  it('leaves them out of tag counts unless asked', async () => {
    const project = await setup()
    await projectsRepo.update(project.id, { status: 'archived' })

    const summary = async (includeArchived: boolean) =>
      (await tagsRepo.list({ includeArchived })).map((t) => [t.name, t.count])

    expect(await summary(false)).toEqual([['shared', 1]])
    expect(await summary(true)).toEqual([['shared', 2]])
  })
})

describe('tags', () => {
  it('counts live items and drops tags nobody uses', async () => {
    const a = await itemsRepo.create({
      title: 'a',
      section: 'market',
      tags: ['x', 'y'],
    })
    await itemsRepo.create({ title: 'b', section: 'market', tags: ['x'] })

    const summary = async () =>
      (await tagsRepo.list()).map((t) => [t.name, t.count])

    expect(await summary()).toEqual([
      ['x', 2],
      ['y', 1],
    ])

    await itemsRepo.remove(a.id)
    expect(await summary()).toEqual([['x', 1]])
  })
})