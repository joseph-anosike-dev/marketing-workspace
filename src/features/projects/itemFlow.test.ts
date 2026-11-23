import { describe, expect, it } from 'vitest'
import { itemsRepo, projectsRepo } from '@/data/repositories'
import { buildMetadata } from './sectionFields'

describe('findings with section fields and tags', () => {
  it('stores section fields and tags and reads them back', async () => {
    const project = await projectsRepo.create({ name: 'P' })
    const created = await itemsRepo.create({
      title: 'Hook swipe',
      section: 'advertising',
      project_id: project.id,
      source_url: 'https://example.com/ad',
      kind: 'link',
      metadata: buildMetadata({}, 'advertising', {
        ad_platform: 'TikTok',
        ad_hook: 'Tired of 3am wake-ups?',
      }),
      tags: ['Hooks', 'tiktok'],
    })

    const loaded = await itemsRepo.get(created.id)
    expect(loaded?.metadata).toEqual({
      ad_platform: 'TikTok',
      ad_hook: 'Tired of 3am wake-ups?',
    })
    expect(loaded?.tags).toEqual(['hooks', 'tiktok'])
    expect(loaded?.kind).toBe('link')
  })

  it('swaps the section fields when the section changes', async () => {
    const created = await itemsRepo.create({
      title: 'x',
      section: 'competitor',
      metadata: { competitor_name: 'Acme', imported_from: 'csv' },
    })
    const updated = await itemsRepo.update(created.id, {
      section: 'product',
      metadata: buildMetadata(created.metadata, 'product', { product_type: 'eBook' }),
    })
    expect(updated.section).toBe('product')
    expect(updated.metadata).toEqual({ imported_from: 'csv', product_type: 'eBook' })
  })

  it('moves a finding to another project and to the Vault', async () => {
    const a = await projectsRepo.create({ name: 'A' })
    const b = await projectsRepo.create({ name: 'B' })
    const item = await itemsRepo.create({
      title: 'x',
      section: 'market',
      project_id: a.id,
    })

    expect((await itemsRepo.update(item.id, { project_id: b.id })).project_id).toBe(b.id)
    expect(await itemsRepo.list({ projectId: a.id })).toHaveLength(0)

    expect((await itemsRepo.update(item.id, { project_id: null })).project_id).toBeNull()
    expect(await itemsRepo.list({ projectId: null })).toHaveLength(1)
  })

  it('refuses to move a finding to a project that does not exist', async () => {
    const item = await itemsRepo.create({ title: 'x', section: 'market' })
    await expect(
      itemsRepo.update(item.id, { project_id: 'ghost' }),
    ).rejects.toThrow(/Project not found/)
  })
})