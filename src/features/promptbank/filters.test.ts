import { describe, expect, it } from 'vitest'
import { ENTRIES } from './content'
import { filterEntries, parseSection, parseStage } from './filters'

describe('filterEntries', () => {
  it('shows only guides or only prompts', () => {
    expect(filterEntries(ENTRIES, { kind: 'guide' }).every((e) => e.kind === 'guide')).toBe(true)
    expect(filterEntries(ENTRIES, { kind: 'ai-prompt' }).every((e) => e.kind === 'ai-prompt')).toBe(true)
  })

  it('filters by section and stage', () => {
    const list = filterEntries(ENTRIES, { kind: 'guide', section: 'customer', stage: 'pain-and-trigger' })
    expect(list.map((e) => e.id)).toEqual(['customer-buying-triggers'])
  })

  it('searches titles, steps and labels, needing every word to match', () => {
    expect(filterEntries(ENTRIES, { kind: 'guide', search: 'autocomplete' }).length).toBeGreaterThan(0)
    expect(filterEntries(ENTRIES, { kind: 'guide', search: 'autocomplete zzzzqq' })).toEqual([])
    expect(filterEntries(ENTRIES, { kind: 'guide', search: 'TRIGGERS' }).length).toBeGreaterThan(0)
  })

  it('lists in journey order, observation first', () => {
    const stages = filterEntries(ENTRIES, { kind: 'guide' }).map((e) => e.stage)
    expect(stages[0]).toBe('observation')
    expect(stages.at(-1)).toBe('testing')
  })

  it('ignores unknown section and stage values from the address bar', () => {
    expect(parseSection('market')).toBe('market')
    expect(parseSection('bogus')).toBeUndefined()
    expect(parseStage('testing')).toBe('testing')
    expect(parseStage(null)).toBeUndefined()
  })
})
