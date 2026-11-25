import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const native = vi.hoisted(() => ({
  isNative: false,
  writeFile: vi.fn(),
  share: vi.fn(),
}))

vi.mock('@capacitor/core', () => ({
  Capacitor: { isNativePlatform: () => native.isNative },
}))
vi.mock('@capacitor/filesystem', () => ({
  Directory: { Cache: 'CACHE' },
  Encoding: { UTF8: 'utf8' },
  Filesystem: { writeFile: native.writeFile },
}))
vi.mock('@capacitor/share', () => ({ Share: { share: native.share } }))

import { downloadBinaryFile, downloadTextFile } from './download'

beforeEach(() => {
  native.isNative = false
  native.writeFile.mockReset().mockResolvedValue({ uri: 'file:///cache/out.json' })
  native.share.mockReset().mockResolvedValue({})
})

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('in a browser', () => {
  it('starts a normal download and does not touch the phone APIs', async () => {
    const link = { href: '', download: '', click: vi.fn(), remove: vi.fn() }
    vi.stubGlobal('document', {
      createElement: vi.fn(() => link),
      body: { appendChild: vi.fn() },
    })
    vi.stubGlobal('window', { setTimeout: vi.fn() })

    await downloadTextFile('backup.json', '{}', 'application/json')

    expect(link.download).toBe('backup.json')
    expect(link.click).toHaveBeenCalledOnce()
    expect(native.writeFile).not.toHaveBeenCalled()
    expect(native.share).not.toHaveBeenCalled()
  })
})

describe('inside the app', () => {
  beforeEach(() => {
    native.isNative = true
  })

  it('writes text to temporary storage and opens the share sheet', async () => {
    await downloadTextFile('backup.json', '{"a":1}', 'application/json')

    expect(native.writeFile).toHaveBeenCalledWith({
      path: 'backup.json',
      data: '{"a":1}',
      directory: 'CACHE',
      encoding: 'utf8',
    })
    expect(native.share).toHaveBeenCalledWith(
      expect.objectContaining({ url: 'file:///cache/out.json' }),
    )
  })

  it('writes binary files as base64', async () => {
    vi.stubGlobal(
      'FileReader',
      class {
        result: string | null = null
        error: Error | null = null
        onload: (() => void) | null = null
        onerror: (() => void) | null = null
        readAsDataURL() {
          this.result = 'data:application/zip;base64,AQID'
          this.onload?.()
        }
      },
    )

    await downloadBinaryFile('export.zip', new Uint8Array([1, 2, 3]), 'application/zip')

    expect(native.writeFile).toHaveBeenCalledWith({
      path: 'export.zip',
      data: 'AQID',
      directory: 'CACHE',
    })
  })

  it('cannot be tricked into writing outside the temporary folder', async () => {
    await downloadTextFile('../../evil/name.json', '{}')
    expect(native.writeFile.mock.calls[0][0].path).toBe('.._.._evil_name.json')
  })

  it('treats closing the share sheet as success', async () => {
    native.share.mockRejectedValue(new Error('Share canceled'))
    await expect(downloadTextFile('a.json', '{}')).resolves.toBeUndefined()
  })

  it('still reports real failures', async () => {
    native.share.mockRejectedValue(new Error('No app can handle this'))
    await expect(downloadTextFile('a.json', '{}')).rejects.toThrow('No app can handle this')

    native.writeFile.mockRejectedValue(new Error('Disk full'))
    await expect(downloadTextFile('a.json', '{}')).rejects.toThrow('Disk full')
  })
})
