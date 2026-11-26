import { describe, expect, it } from 'vitest'
import {
  checklistText,
  completedPrompt,
  fillPasteSlots,
  fillPlaceholders,
  guideText,
  pasteSlots,
  placeholdersIn,
} from './placeholders'
import type { AiPromptEntry, GuideEntry } from './types'

describe('placeholders', () => {
  it('finds each {name} once, in order', () => {
    expect(placeholdersIn('{niche} and {audience} and {niche}')).toEqual(['niche', 'audience'])
  })

  it('fills typed values and leaves blank ones showing', () => {
    expect(fillPlaceholders('A {niche} for {audience}', { niche: ' desks ', audience: '  ' })).toBe(
      'A desks for {audience}',
    )
  })

  it('does not treat a typed value as something to fill again', () => {
    expect(fillPlaceholders('{niche}', { niche: '{audience}' })).toBe('{audience}')
  })
})

describe('paste slots', () => {
  const prompt = 'Intro\n[Paste customer findings here]\nand\n[Paste competitor findings here]'

  it('names what each slot asks for', () => {
    expect(pasteSlots(prompt)).toEqual(['customer findings', 'competitor findings'])
  })

  it('fills slots in order and keeps an empty one as written', () => {
    expect(fillPasteSlots(prompt, ['C1', ''])).toBe(
      'Intro\nC1\nand\n[Paste competitor findings here]',
    )
  })

  it('leaves pasted text alone, including special characters', () => {
    expect(fillPasteSlots('[Paste x here]', ['cost $& {niche}'])).toBe('cost $& {niche}')
  })
})

describe('copied text', () => {
  const guide: GuideEntry = {
    id: 'g',
    kind: 'guide',
    section: 'market',
    stage: 'observation',
    title: 'Look at {niche}',
    purpose: 'P {niche}',
    placeholders: ['niche'],
    items: ['One {niche}', 'Two'],
    good_looks_like: 'Good',
  }
  const ai: AiPromptEntry = {
    id: 'a',
    kind: 'ai-prompt',
    section: 'market',
    stage: 'observation',
    title: 'T',
    purpose: 'P',
    placeholders: ['niche'],
    prompt: 'About {niche}.\n[Paste findings here]',
    good_looks_like: 'G',
  }

  it('writes a checklist as Markdown tasks, ticking the done rows', () => {
    expect(checklistText(guide, { niche: 'desks' }, [1])).toBe('- [ ] One desks\n- [x] Two')
  })

  it('writes the whole guide', () => {
    const text = guideText(guide, { niche: 'desks' })
    expect(text).toContain('# Look at desks')
    expect(text).toContain('**What good looks like:** Good')
  })

  it('builds the completed prompt without changing the stored one', () => {
    expect(completedPrompt(ai, { niche: 'desks' }, ['finding 1'])).toBe('About desks.\nfinding 1')
    expect(ai.prompt).toBe('About {niche}.\n[Paste findings here]')
  })
})
