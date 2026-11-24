import { describe, expect, it } from 'vitest'
import { readZip, textOf } from '@/tests/zipReader'
import { ZipError, createZip } from './zip'

describe('createZip', () => {
  it('writes files that can be read back exactly', () => {
    const binary = new Uint8Array([0, 1, 2, 250, 255, 128])
    const zip = createZip([
      { path: 'project/readme.md', data: '# Hello\n' },
      { path: 'project/attachments/a.png', data: binary },
      { path: 'project/empty.md', data: '' },
    ])
    const entries = readZip(zip)
    expect(entries.map((e) => e.path)).toEqual([
      'project/readme.md',
      'project/attachments/a.png',
      'project/empty.md',
    ])
    expect(textOf(entries[0])).toBe('# Hello\n')
    expect(entries[1].bytes).toEqual(binary)
    expect(entries[2].bytes.length).toBe(0)
  })

  it('stores names as UTF-8 and files without compression', () => {
    const [entry] = readZip(createZip([{ path: 'notes/café-日本.md', data: 'x' }]))
    expect(entry.path).toBe('notes/café-日本.md')
    expect(entry.flags & 0x0800).toBe(0x0800)
    expect(entry.method).toBe(0)
  })

  it('keeps the modified time', () => {
    const modified = new Date(2026, 10, 24, 14, 30, 10)
    const [entry] = readZip(createZip([{ path: 'a.md', data: 'x', modified }]))
    expect(entry.modified.getTime()).toBe(modified.getTime())
  })

  it('uses the fallback date when an entry has no valid date', () => {
    const fallbackDate = new Date(2025, 0, 2, 3, 4, 6)
    const [entry] = readZip(
      createZip([{ path: 'a.md', data: 'x', modified: new Date('nonsense') }], {
        fallbackDate,
      }),
    )
    expect(entry.modified.getTime()).toBe(fallbackDate.getTime())
  })

  it('makes a valid empty zip', () => {
    const zip = createZip([])
    expect(zip.length).toBe(22)
    expect(readZip(zip)).toEqual([])
  })

  it('refuses duplicate paths, ignoring case', () => {
    expect(() =>
      createZip([
        { path: 'a/Note.md', data: '1' },
        { path: 'a/note.md', data: '2' },
      ]),
    ).toThrow(ZipError)
  })

  it('refuses unsafe paths', () => {
    for (const path of ['', '/abs.md', '../up.md', 'a/../b.md', 'a//b.md', 'a\\b.md', 'dir/']) {
      expect(() => createZip([{ path, data: 'x' }])).toThrow(/Unsafe file path/)
    }
  })

  it('refuses exports over the size limit with a readable message', () => {
    expect(() =>
      createZip([{ path: 'a.txt', data: 'hello' }], { maxBytes: 10 }),
    ).toThrow(/too large/)
  })
})