import { describe, expect, it } from 'vitest'
import { buildFrontmatter, yamlKey, yamlRaw, yamlString } from './yaml'

describe('yamlString', () => {
  it('quotes plain text', () => {
    expect(yamlString('hello')).toBe('"hello"')
  })

  it('keeps colons, hashes and quotes safe', () => {
    expect(yamlString('Pricing: the #1 "question"')).toBe(
      '"Pricing: the #1 \\"question\\""',
    )
  })

  it('escapes backslashes and line breaks', () => {
    expect(yamlString('a\\b\nc')).toBe('"a\\\\b\\nc"')
  })

  it('leaves emoji and accents alone', () => {
    expect(yamlString('café 🎯')).toBe('"café 🎯"')
  })

  it('writes characters YAML treats as line breaks as escapes', () => {
    const text = yamlString('a\u2028b\u0085c\u007fd')
    expect(text).toBe('"a\\u2028b\\u0085c\\u007fd"')
  })

  it('reads back to the same text', () => {
    const samples = [
      '',
      'plain',
      '- starts like a list',
      '# not a comment',
      'yes',
      'null',
      '12:30',
      "it's",
      'tab\there',
      'a\u2028b\u2029c\u0085d\u007fe\ufefff',
      '{braces} [brackets] & *star* !bang %percent @at',
    ]
    for (const sample of samples) {
      expect(JSON.parse(yamlString(sample))).toBe(sample)
    }
  })
})

describe('yamlKey', () => {
  it('leaves normal keys bare', () => {
    expect(yamlKey('competitor_price')).toBe('competitor_price')
    expect(yamlKey('ad-hook')).toBe('ad-hook')
  })

  it('quotes keys YAML would misread', () => {
    expect(yamlKey('no')).toBe('"no"')
    expect(yamlKey('True')).toBe('"True"')
    expect(yamlKey('two words')).toBe('"two words"')
    expect(yamlKey('1abc')).toBe('"1abc"')
  })
})

describe('buildFrontmatter', () => {
  it('writes properties in order, with lists and raw dates', () => {
    const text = buildFrontmatter([
      ['title', 'Acme: pricing'],
      ['tags', ['baby-sleep', 'pricing']],
      ['empty', []],
      ['created', yamlRaw('2026-11-24T14:30:05')],
      ['count', 3],
      ['done', false],
    ])
    expect(text).toBe(
      [
        '---',
        'title: "Acme: pricing"',
        'tags:',
        '  - "baby-sleep"',
        '  - "pricing"',
        'empty: []',
        'created: 2026-11-24T14:30:05',
        'count: 3',
        'done: false',
        '---',
      ].join('\n'),
    )
  })
})