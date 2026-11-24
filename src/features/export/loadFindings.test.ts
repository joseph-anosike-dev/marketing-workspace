import { describe, expect, it } from 'vitest'
import { attachmentsRepo, itemsRepo, projectsRepo } from '@/data/repositories'
import { MAX_ZIP_BYTES } from '@/lib/zip'
import { readZip, textOf } from '@/tests/zipReader'
import type { Attachment, ResearchItemView } from '@/types'
import {
  exportCollection,
  exportFinding,
  exportProject,
  type ExportFinding,
} from './bundle'
import { summarizeVaultFilters } from './filterSummary'
import { assertExportFits, loadExportFinding, loadExportFindings } from './loadFindings'
import { readVaultFilters } from '@/features/vault/filters'

const NOW = new Date(2026, 10, 24, 9, 0, 0)

function pngBlob(seed: number): Blob {
  const bytes = new Uint8Array(32)
  bytes.set([137, 80, 78, 71, 13, 10, 26, 10])
  for (let i = 8; i < bytes.length; i++) bytes[i] = (i * seed) % 256
  return new Blob([bytes], { type: 'image/png' })
}

async function addImages(itemId: string, count: number) {
  await attachmentsRepo.apply(itemId, {
    add: Array.from({ length: count }, (_, i) => ({
      file_name: `shot-${i + 1}.png`,
      mime_type: 'image/png',
      blob: pngBlob(i + 3),
    })),
    removeIds: [],
  })
}

describe('loadExportFindings', () => {
  it('returns nothing for no findings', async () => {
    expect(await loadExportFindings([])).toEqual([])
  })

  it('adds images and project names, including archived projects', async () => {
    const mums = await projectsRepo.create({ name: 'Mums' })
    const old = await projectsRepo.create({ name: 'Old ideas' })
    const withImages = await itemsRepo.create({
      title: 'With images',
      section: 'market',
      project_id: mums.id,
    })
    const inOld = await itemsRepo.create({
      title: 'In old',
      section: 'market',
      project_id: old.id,
    })
    const loose = await itemsRepo.create({ title: 'Loose', section: 'market' })
    await addImages(withImages.id, 2)
    await projectsRepo.update(old.id, { status: 'archived' })

    const items = await itemsRepo.list({ includeArchived: true })
    const findings = await loadExportFindings(items)
    const byId = new Map(findings.map((f) => [f.item.id, f]))

    expect(findings).toHaveLength(3)
    expect(byId.get(withImages.id)?.projectName).toBe('Mums')
    expect(byId.get(withImages.id)?.attachments.map((a) => a.file_name)).toEqual([
      'shot-1.png',
      'shot-2.png',
    ])
    expect(byId.get(inOld.id)?.projectName).toBe('Old ideas')
    expect(byId.get(inOld.id)?.attachments).toEqual([])
    expect(byId.get(loose.id)?.projectName).toBeNull()
  })
})

describe('exports built from loaded findings', () => {
  it('turns a finding with images into a zip holding the note and its images', async () => {
    const item = await itemsRepo.create({ title: 'Pricing page', section: 'competitor' })
    await addImages(item.id, 2)

    const result = await exportFinding(await loadExportFinding(item), NOW)
    const entries = readZip(result.file.bytes)

    expect(result.file.fileName).toBe('pricing-page.zip')
    expect(result.findingCount).toBe(1)
    expect(result.imageCount).toBe(2)
    expect(entries.filter((e) => e.path.endsWith('.md'))).toHaveLength(1)
    expect(entries.filter((e) => e.path.includes('/attachments/'))).toHaveLength(2)
  })

  it('turns a finding without images into a single .md file', async () => {
    const item = await itemsRepo.create({ title: 'Just a note', section: 'general' })
    const result = await exportFinding(await loadExportFinding(item), NOW)
    expect(result.file.fileName).toBe('just-a-note.md')
    expect(result.imageCount).toBe(0)
  })

  it('exports an archived project with all of its findings', async () => {
    const project = await projectsRepo.create({ name: 'Shelved' })
    const a = await itemsRepo.create({
      title: 'First',
      section: 'market',
      project_id: project.id,
    })
    await itemsRepo.create({ title: 'Second', section: 'keyword', project_id: project.id })
    await addImages(a.id, 1)
    await projectsRepo.update(project.id, { status: 'archived' })

    const archived = await projectsRepo.get(project.id)
    const items = await itemsRepo.list({ projectId: project.id })
    const result = await exportProject(archived!, await loadExportFindings(items), NOW)
    const entries = readZip(result.file.bytes)

    expect(result.findingCount).toBe(2)
    expect(result.imageCount).toBe(1)
    expect(entries.filter((e) => e.path.endsWith('.md'))).toHaveLength(3) // index + 2 notes
  })

  it('records the filters in the Vault index note', async () => {
    const item = await itemsRepo.create({ title: 'Sleep tips', section: 'market' })
    const filters = readVaultFilters(new URLSearchParams('q=sleep&section=market'))

    const result = await exportCollection(
      await loadExportFindings([item]),
      { filters: summarizeVaultFilters(filters, []) },
      NOW,
    )
    const index = readZip(result.file.bytes).find(
      (e) => e.path === 'research-vault/research-vault.md',
    )

    expect(index).toBeDefined()
    expect(textOf(index!)).toContain('> Filters used: Search “sleep” · Section: Market Research')
  })

  it('refuses to export nothing', async () => {
    await expect(exportCollection([], {}, NOW)).rejects.toThrow(/no findings/)
  })
})

describe('assertExportFits', () => {
  function findingWithImageBytes(size: number): ExportFinding {
    const item: ResearchItemView = {
      id: 'i1',
      owner_id: 'owner',
      created_at: NOW.toISOString(),
      updated_at: NOW.toISOString(),
      deleted_at: null,
      project_id: null,
      section: 'market',
      kind: 'note',
      title: 'Big',
      body: '',
      source_url: null,
      metadata: {},
      tags: [],
    }
    const attachment: Attachment = {
      id: 'a1',
      owner_id: 'owner',
      item_id: 'i1',
      file_name: 'big.png',
      mime_type: 'image/png',
      size_bytes: size,
      blob: null,
      storage_path: null,
      created_at: NOW.toISOString(),
    }
    return { item, attachments: [attachment], projectName: null }
  }

  it('accepts a normal export', () => {
    expect(() => assertExportFits([findingWithImageBytes(1024)])).not.toThrow()
  })

  it('refuses an export whose images are over the limit, with a readable message', () => {
    expect(() => assertExportFits([findingWithImageBytes(MAX_ZIP_BYTES + 1)])).toThrow(
      /too large.*Narrow your filters/,
    )
  })
})
