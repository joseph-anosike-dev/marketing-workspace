import { describe, expect, it } from 'vitest'
import { SECTIONS } from '@/types'
import { ENTRIES, getEntry } from './content'
import { validateEntries } from './validate'
import { STAGE_IDS, type GuideEntry, type PromptEntry } from './types'

describe('the content library', () => {
  it('has no problems', () => {
    expect(validateEntries(ENTRIES)).toEqual([])
  })

  it('ships 21 guides and 10 optional AI prompts', () => {
    expect(ENTRIES.filter((e) => e.kind === 'guide')).toHaveLength(21)
    expect(ENTRIES.filter((e) => e.kind === 'ai-prompt')).toHaveLength(10)
  })

  it('has three guides and at least one prompt for every section', () => {
    for (const section of SECTIONS) {
      expect(ENTRIES.filter((e) => e.kind === 'guide' && e.section === section), section).toHaveLength(3)
      expect(ENTRIES.filter((e) => e.kind === 'ai-prompt' && e.section === section).length, section).toBeGreaterThan(0)
    }
  })

  it('keeps the guides in one section on different stages', () => {
    for (const section of SECTIONS) {
      const stages = ENTRIES.filter((e) => e.kind === 'guide' && e.section === section).map((e) => e.stage)
      expect(new Set(stages).size, section).toBe(stages.length)
    }
  })

  it('has at least one guide for every stage of the journey', () => {
    for (const stage of STAGE_IDS) {
      expect(ENTRIES.some((e) => e.kind === 'guide' && e.stage === stage), stage).toBe(true)
    }
  })

  it('finds an entry by id', () => {
    expect(getEntry('market-observation-signals')?.kind).toBe('guide')
    expect(getEntry('nope')).toBeUndefined()
  })
})

describe('validateEntries', () => {
  const guide: GuideEntry = {
    id: 'a-guide',
    kind: 'guide',
    section: 'market',
    stage: 'observation',
    title: 'T',
    purpose: 'About {niche}.',
    placeholders: ['niche'],
    items: ['Do {niche}.'],
    good_looks_like: 'Good.',
  }

  it('accepts a correct entry', () => {
    expect(validateEntries([guide])).toEqual([])
  })

  it('catches duplicate ids, bad ids and mismatched placeholders', () => {
    const bad: GuideEntry = { ...guide, id: 'Bad_Id', placeholders: [] }
    const problems = validateEntries([guide, guide, bad]).join('\n')
    expect(problems).toContain('used twice')
    expect(problems).toContain('kebab-case')
    expect(problems).toContain('do not match')
  })

  it('catches a guide with no items, and an unknown placeholder', () => {
    const empty: GuideEntry = { ...guide, id: 'empty', items: [] }
    const odd: GuideEntry = { ...guide, id: 'odd', items: ['Do {mystery}.'] }
    const problems = validateEntries([empty, odd]).join('\n')
    expect(problems).toContain('needs checklist items')
    expect(problems).toContain('unknown placeholder {mystery}')
  })

  it('catches an AI prompt with no findings slot or evidence rules', () => {
    const weak: PromptEntry = {
      id: 'weak-prompt',
      kind: 'ai-prompt',
      section: 'market',
      stage: 'observation',
      title: 'T',
      purpose: 'P',
      placeholders: [],
      prompt: 'Summarise everything.',
      good_looks_like: 'G',
    }
    const problems = validateEntries([weak]).join('\n')
    expect(problems).toContain('Paste')
    expect(problems).toContain('invent')
    expect(problems).toContain('hypotheses')
  })
})
