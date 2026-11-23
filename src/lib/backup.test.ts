import { describe, expect, it } from 'vitest'
import { itemsRepo, projectsRepo } from '@/data/repositories'
import { db } from '@/lib/db'
import {
  BackupError,
  buildBackup,
  parseBackup,
  restoreBackup,
  type BackupFile,
} from './backup'

async function seed() {
  const project = await projectsRepo.create({
    name: 'Mums',
    description: 'First-time mothers',
  })
  await itemsRepo.create({
    title: 'Kept',
    section: 'customer',
    project_id: project.id,
    source_url: 'https://example.com/a',
    tags: ['sleep', 'baby'],
    body: '# Hello',
  })
  await itemsRepo.create({ title: 'Loose', section: 'keyword', tags: ['sleep'] })
  const gone = await itemsRepo.create({ title: 'Gone', section: 'market' })
  await itemsRepo.remove(gone.id)
  return project
}

async function freshCopy(): Promise<BackupFile> {
  return JSON.parse(JSON.stringify(await buildBackup())) as BackupFile
}

async function wipe() {
  await Promise.all(db.tables.map((table) => table.clear()))
}

describe('buildBackup', () => {
  it('includes soft-deleted records', async () => {
    await seed()
    const backup = await buildBackup()
    expect(backup.tables.research_items).toHaveLength(3)
    expect(backup.tables.research_items.filter((i) => i.deleted_at)).toHaveLength(1)
  })
})

describe('backup and restore', () => {
  it('round-trips projects, items, URLs, notes and tags', async () => {
    const project = await seed()
    const text = JSON.stringify(await buildBackup())
    await wipe()
    expect(await itemsRepo.list()).toHaveLength(0)

    const summary = await restoreBackup(parseBackup(text))
    expect(summary).toEqual({
    projects: 1,
    items: 2,
    tags: 2,
    bookmarks: 0,
    attachments: 0,
    })
    

    const items = await itemsRepo.list()
    expect(items.map((i) => i.title).sort()).toEqual(['Kept', 'Loose'])
    expect(items.find((i) => i.title === 'Kept')).toMatchObject({
      project_id: project.id,
      source_url: 'https://example.com/a',
      body: '# Hello',
      tags: ['baby', 'sleep'],
    })
  })

  it('replaces whatever data was there before', async () => {
    await seed()
    const text = JSON.stringify(await buildBackup())
    await wipe()
    await projectsRepo.create({ name: 'Old' })

    await restoreBackup(parseBackup(text))

    expect((await projectsRepo.list()).map((p) => p.name)).toEqual(['Mums'])
  })

  it('leaves existing data untouched if a restore fails halfway', async () => {
    await seed()
    const bad = await freshCopy()
    // A second tag with the same id makes the database refuse it mid-restore.
    bad.tables.tags.push({ ...bad.tables.tags[0], name: 'other-name' })
    await projectsRepo.create({ name: 'Existing' })

    await expect(restoreBackup(bad)).rejects.toThrow()

    const names = (await projectsRepo.list()).map((p) => p.name).sort()
    expect(names).toEqual(['Existing', 'Mums'])
  })
})

describe('parseBackup rejects bad files', () => {
  it('rejects text that is not JSON', () => {
    expect(() => parseBackup('{oops')).toThrow(/not valid JSON/)
    expect(() => parseBackup('{oops')).toThrow(BackupError)
  })

  it('rejects JSON from some other app', () => {
    expect(() => parseBackup(JSON.stringify({ app: 'other', format_version: 1 }))).toThrow(
      /not a Marketing Workspace backup/,
    )
  })

  it('rejects a backup from a newer version', () => {
    expect(() =>
      parseBackup(JSON.stringify({ app: 'marketing-workspace', format_version: 99 })),
    ).toThrow(/newer version/)
  })

  async function expectRejected(mutate: (b: BackupFile) => void, message: RegExp) {
    await seed()
    const backup = await freshCopy()
    mutate(backup)
    expect(() => parseBackup(JSON.stringify(backup))).toThrow(message)
  }

  it('rejects a script address in a source URL', async () => {
    await expectRejected((b) => {
      b.tables.research_items[0].source_url = 'javascript:alert(1)'
    }, /source_url/)
  })

  it('rejects an unknown section', async () => {
    await expectRejected((b) => {
      b.tables.research_items[0].section = 'nonsense' as never
    }, /section/)
  })

  it('rejects an item that points to a missing project', async () => {
    await expectRejected((b) => {
      b.tables.research_items.forEach((i) => {
        i.project_id = 'ghost'
      })
    }, /not in the backup/)
  })

  it('rejects duplicate tag names', async () => {
    await expectRejected((b) => {
      b.tables.tags.push({ ...b.tables.tags[0], id: 'another-id' })
    }, /duplicate tag names/)
  })

  it('rejects a tag link to a missing tag', async () => {
    await expectRejected((b) => {
      b.tables.research_item_tags.push({
        item_id: b.tables.research_items[0].id,
        tag_id: 'ghost',
      })
    }, /not in the backup/)
  })

  it('rejects a backup with a missing table', async () => {
    await expectRejected((b) => {
      ;(b.tables as Record<string, unknown>).bookmarks = undefined
    }, /bookmarks/)
  })
})