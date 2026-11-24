import { describe, expect, it } from 'vitest'
import { readZip, textOf, type ReadEntry } from '@/tests/zipReader'
import type { Attachment, Project, ResearchItemView } from '@/types'
import {
  exportCollection,
  exportFinding,
  exportProject,
  type ExportFinding,
} from './bundle'

const NOW = new Date(2026, 10, 24, 9, 0, 0)
const PNG = new Uint8Array([137, 80, 78, 71, 13, 10, 26, 10])
const JPG = new Uint8Array([255, 216, 255, 224])

function makeItem(id: string, title: string, overrides: Partial<ResearchItemView> = {}): ResearchItemView {
  return {
    id,
    owner_id: 'owner',
    created_at: new Date(2026, 10, 20, 10, 0, Number(id.replace(/\D/g, '')) || 0).toISOString(),
    updated_at: new Date(2026, 10, 21, 10, 0, 0).toISOString(),
    deleted_at: null,
    project_id: 'p1',
    section: 'market',
    kind: 'note',
    title,
    body: `Notes for ${title}`,
    source_url: null,
    metadata: {},
    tags: [],
    ...overrides,
  }
}

function makeAttachment(
  itemId: string,
  name: string,
  bytes: Uint8Array,
  type = 'image/png',
  blob: boolean = true,
): Attachment {
  return {
    id: `${itemId}-${name}`,
    owner_id: 'owner',
    item_id: itemId,
    file_name: name,
    mime_type: type,
    size_bytes: bytes.length,
    blob: blob ? new Blob([new Uint8Array(bytes)], { type }) : null,
    storage_path: null,
    created_at: new Date(2026, 10, 21, 10, 0, 0).toISOString(),
  }
}

const project: Project = {
  id: 'p1',
  owner_id: 'owner',
  created_at: new Date(2026, 10, 1, 10, 0, 0).toISOString(),
  updated_at: new Date(2026, 10, 2, 10, 0, 0).toISOString(),
  deleted_at: null,
  name: 'Acme Research',
  description: 'About Acme',
  status: 'active',
}

function pathsOf(entries: ReadEntry[]): string[] {
  return entries.map((e) => e.path)
}

/** Follows a link written inside a note, the way Obsidian does. */
function resolve(notePath: string, link: string): string {
  const parts = notePath.split('/').slice(0, -1)
  for (const piece of link.split('/')) {
    if (piece === '..') parts.pop()
    else if (piece !== '.') parts.push(piece)
  }
  return parts.join('/')
}

describe('exportFinding', () => {
  it('is a single .md file when there are no images', async () => {
    const result = await exportFinding(
      { item: makeItem('i1', 'Acme pricing'), attachments: [], projectName: 'Acme Research' },
      NOW,
    )
    expect(result.file.fileName).toBe('acme-pricing.md')
    expect(result.file.mimeType).toBe('text/markdown')
    expect(new TextDecoder().decode(result.file.bytes).startsWith('---\ntitle: "Acme pricing"')).toBe(true)
    expect(result.imageCount).toBe(0)
  })

  it('is a zip with an attachments folder when there are images', async () => {
    const result = await exportFinding(
      {
        item: makeItem('i1', 'Acme pricing'),
        attachments: [
          makeAttachment('i1', 'Screenshot 1.png', PNG),
          makeAttachment('i1', 'photo.JPG', JPG, 'image/jpeg'),
        ],
        projectName: null,
      },
      NOW,
    )
    expect(result.file.fileName).toBe('acme-pricing.zip')
    const entries = readZip(result.file.bytes)
    expect(pathsOf(entries)).toEqual([
      'acme-pricing/acme-pricing.md',
      'acme-pricing/attachments/acme-pricing-1.png',
      'acme-pricing/attachments/acme-pricing-2.jpg',
    ])
    const note = textOf(entries[0])
    expect(note).toContain('![Screenshot 1](attachments/acme-pricing-1.png)')
    expect(note).toContain('![photo](attachments/acme-pricing-2.jpg)')
    expect(entries[1].bytes).toEqual(PNG)
    expect(entries[2].bytes).toEqual(JPG)
  })

  it('warns about images it cannot include', async () => {
    const result = await exportFinding(
      {
        item: makeItem('i1', 'Acme pricing'),
        attachments: [
          makeAttachment('i1', 'gone.png', PNG, 'image/png', false),
          makeAttachment('i1', 'odd.bmp', PNG, 'image/bmp'),
        ],
        projectName: null,
      },
      NOW,
    )
    expect(result.warnings).toHaveLength(2)
    expect(result.file.fileName).toBe('acme-pricing.md')
  })
})

describe('exportProject', () => {
  const findings: ExportFinding[] = [
    {
      item: makeItem('i1', 'Pricing', { source_url: 'https://example.com/p', tags: ['pricing'] }),
      attachments: [makeAttachment('i1', 'a.png', PNG)],
      projectName: 'Acme Research',
    },
    { item: makeItem('i2', 'Pricing'), attachments: [], projectName: 'Acme Research' },
    {
      item: makeItem('i3', 'Why parents buy', { section: 'customer' }),
      attachments: [makeAttachment('i3', 'b.jpg', JPG, 'image/jpeg')],
      projectName: 'Acme Research',
    },
  ]

  it('builds one folder with an index, section folders and attachments', async () => {
    const result = await exportProject(project, findings, NOW)
    expect(result.file.fileName).toBe('acme-research-2026-11-24.zip')
    expect(result.findingCount).toBe(3)
    expect(result.imageCount).toBe(2)

    const entries = readZip(result.file.bytes)
    expect(pathsOf(entries)).toEqual([
      'acme-research/acme-research.md',
      'acme-research/market/pricing.md',
      'acme-research/market/pricing-2.md',
      'acme-research/customer/why-parents-buy.md',
      'acme-research/attachments/pricing-1.png',
      'acme-research/attachments/why-parents-buy-1.jpg',
    ])
  })

  it('links every image and every index entry to a file that exists', async () => {
    const result = await exportProject(project, findings, NOW)
    const entries = readZip(result.file.bytes)
    const paths = new Set(pathsOf(entries))

    const imageLink = /!\[[^\]]*\]\(([^)]+)\)/g
    let checkedImages = 0
    for (const entry of entries.filter((e) => e.path.includes('/market/') || e.path.includes('/customer/'))) {
      for (const match of textOf(entry).matchAll(imageLink)) {
        expect(paths.has(resolve(entry.path, match[1]))).toBe(true)
        checkedImages++
      }
    }
    expect(checkedImages).toBe(2)

    const index = textOf(entries[0])
    const wikilinks = [...index.matchAll(/\[\[([^\]|\\]+)\\\|/g)].map((m) => m[1])
    expect(wikilinks).toHaveLength(3)
    for (const target of wikilinks) expect(paths.has(`${target}.md`)).toBe(true)
  })

  it('describes the project in the index', async () => {
    const result = await exportProject(project, findings, NOW)
    const index = textOf(readZip(result.file.bytes)[0])
    expect(index).toContain('title: "Acme Research"')
    expect(index).toContain('type: "research-project"')
    expect(index).toContain('findings: 3')
    expect(index).toContain('| Market Research | 2 |')
    expect(index).toContain('| Customer Research | 1 |')
  })

  it('still works for a project with no findings', async () => {
    const result = await exportProject(project, [], NOW)
    expect(pathsOf(readZip(result.file.bytes))).toEqual(['acme-research/acme-research.md'])
  })
})

describe('exportCollection', () => {
  it('names the folder after the title and shows each finding\'s project', async () => {
    const result = await exportCollection(
      [
        { item: makeItem('i1', 'One'), attachments: [], projectName: 'Acme Research' },
        { item: makeItem('i2', 'Two', { project_id: null }), attachments: [], projectName: null },
      ],
      { filters: 'Search: sleep' },
      NOW,
    )
    expect(result.file.fileName).toBe('research-vault-2026-11-24.zip')
    const entries = readZip(result.file.bytes)
    expect(pathsOf(entries)).toEqual([
      'research-vault/research-vault.md',
      'research-vault/market/one.md',
      'research-vault/market/two.md',
    ])
    const index = textOf(entries[0])
    expect(index).toContain('type: "research-vault"')
    expect(index).toContain('> Filters used: Search: sleep')
    expect(index).toContain('Acme Research')
  })

  it('refuses an empty list', async () => {
    await expect(exportCollection([], {}, NOW)).rejects.toThrow(/no findings/)
  })
})