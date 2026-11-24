import { describe, expect, it } from 'vitest'
import type { ResearchItemView } from '@/types'
import { indexToMarkdown, noteToMarkdown, type IndexRow } from './markdown'

function makeItem(overrides: Partial<ResearchItemView> = {}): ResearchItemView {
  return {
    id: 'item-1',
    owner_id: 'owner',
    created_at: new Date(2026, 10, 22, 10, 0, 0).toISOString(),
    updated_at: new Date(2026, 10, 24, 14, 30, 5).toISOString(),
    deleted_at: null,
    project_id: 'project-1',
    section: 'competitor',
    kind: 'link',
    title: 'Acme pricing',
    body: 'First line\n\n| a | b |\n| - | - |\n| 1 | 2 |\n\n- bullet\n',
    source_url: 'https://example.com/a',
    metadata: { competitor_name: 'Acme', competitor_price: '$27' },
    tags: ['baby-sleep', 'pricing'],
    ...overrides,
  }
}

describe('noteToMarkdown', () => {
  it('writes Obsidian properties first', () => {
    const text = noteToMarkdown(makeItem(), 'Sleep project', [])
    expect(text.startsWith('---\ntitle: "Acme pricing"\n')).toBe(true)
    expect(text).toContain('section: "Competitor Research"')
    expect(text).toContain('project: "Sleep project"')
    expect(text).toContain('source: "https://example.com/a"')
    expect(text).toContain('tags:\n  - "baby-sleep"\n  - "pricing"\n')
    expect(text).toContain('competitor_name: "Acme"')
    expect(text).toContain('competitor_price: "$27"')
    expect(text).toContain('id: "item-1"')
  })

  it('writes dates in local time Obsidian understands', () => {
    const text = noteToMarkdown(makeItem(), null, [])
    expect(text).toContain('\ncreated: 2026-11-22T10:00:00\n')
    expect(text).toContain('\nupdated: 2026-11-24T14:30:05\n')
  })

  it('leaves out project and source when there are none', () => {
    const text = noteToMarkdown(makeItem({ source_url: null }), null, [])
    expect(text).not.toContain('project:')
    expect(text).not.toContain('source:')
    expect(text).not.toContain('**Source:**')
  })

  it('escapes titles that would confuse YAML', () => {
    const text = noteToMarkdown(makeItem({ title: 'Pricing: the #1 "question"' }), null, [])
    expect(text).toContain('title: "Pricing: the #1 \\"question\\""')
    expect(text).toContain('\n# Pricing: the #1 "question"\n')
  })

  it('keeps the notes exactly as written', () => {
    const item = makeItem()
    const text = noteToMarkdown(item, null, [])
    expect(text).toContain('First line\n\n| a | b |\n| - | - |\n| 1 | 2 |\n\n- bullet')
  })

  it('adds the source link and images', () => {
    const text = noteToMarkdown(makeItem(), null, [
      { alt: 'shot [1]', path: '../attachments/acme-pricing-1.png' },
    ])
    expect(text).toContain('**Source:** <https://example.com/a>')
    expect(text).toContain('## Images\n\n![shot 1](../attachments/acme-pricing-1.png)')
    expect(text.endsWith('\n')).toBe(true)
  })

  it('has no stray blank lines when the finding has no notes', () => {
    const text = noteToMarkdown(makeItem({ body: '', source_url: null }), null, [])
    expect(text).not.toContain('\n\n\n')
  })

  it('includes only the fields of its own section', () => {
    const text = noteToMarkdown(
      makeItem({
        section: 'market',
        metadata: { observation_type: 'Trend', competitor_price: '$27' },
      }),
      null,
      [],
    )
    expect(text).toContain('observation_type: "Trend"')
    expect(text).not.toContain('competitor_price')
  })
})

describe('indexToMarkdown', () => {
  const rows: IndexRow[] = [
    {
      title: 'Acme pricing',
      target: 'acme/competitor/acme-pricing',
      section: 'competitor',
      projectName: 'Acme | Co',
      source: 'https://example.com/a',
      tags: ['pricing'],
      updatedAt: new Date(2026, 10, 24, 9, 0, 0).toISOString(),
    },
    {
      title: 'Odd [title] | here',
      target: 'acme/market/odd-title-here',
      section: 'market',
      projectName: null,
      source: null,
      tags: [],
      updatedAt: new Date(2026, 10, 23, 9, 0, 0).toISOString(),
    },
  ]
  const base = {
    type: 'research-project' as const,
    title: 'Acme research',
    exportedAt: new Date(2026, 10, 24, 15, 0, 0),
    imageCount: 1,
    rows,
    showProject: false,
  }

  it('writes properties, a summary and a table per section', () => {
    const text = indexToMarkdown({ ...base, description: 'About Acme', status: 'active' })
    expect(text).toContain('type: "research-project"')
    expect(text).toContain('findings: 2')
    expect(text).toContain('images: 1')
    expect(text).toContain('exported: 2026-11-24T15:00:00')
    expect(text).toContain('| Competitor Research | 1 |')
    expect(text).toContain('| Market Research | 1 |')
    expect(text).toContain('| **Total** | **2** |')
    expect(text).toContain('1 image saved in the attachments folder.')
    expect(text).toContain('## Competitor Research')
    expect(text).toContain('## Market Research')
  })

  it('links to notes with escaped bars so tables stay intact', () => {
    const text = indexToMarkdown(base)
    expect(text).toContain('[[acme/competitor/acme-pricing\\|Acme pricing]]')
    expect(text).toContain('[[acme/market/odd-title-here\\|Odd title here]]')
  })

  it('shows the source and tags', () => {
    const text = indexToMarkdown(base)
    expect(text).toContain('<https://example.com/a>')
    expect(text).toContain('#pricing')
    expect(text).toContain('| 2026-11-24 |')
  })

  it('adds a Project column when asked, with the name escaped', () => {
    const text = indexToMarkdown({ ...base, type: 'research-vault', showProject: true })
    expect(text).toContain('| Finding | Project | Source | Tags | Updated |')
    expect(text).toContain('Acme \\| Co')
  })

  it('shows the filters used', () => {
    const text = indexToMarkdown({ ...base, filters: 'Section: Market Research' })
    expect(text).toContain('> Filters used: Section: Market Research')
  })

  it('says so when there are no findings', () => {
    const text = indexToMarkdown({ ...base, rows: [], imageCount: 0 })
    expect(text).toContain('_No findings yet._')
    expect(text).toContain('| **Total** | **0** |')
  })
})