import { describe, expect, it } from 'vitest'
import type { ExportResult } from './bundle'
import { describeExport } from './useExporter'

function result(
  fileName: string,
  findingCount: number,
  imageCount: number,
): ExportResult {
  return {
    file: { fileName, mimeType: 'application/zip', bytes: new Uint8Array(0) },
    warnings: [],
    findingCount,
    imageCount,
  }
}

describe('describeExport', () => {
  it('describes one finding with no images', () => {
    expect(describeExport(result('pricing-page.md', 1, 0))).toBe(
      'Exported 1 finding as pricing-page.md.',
    )
  })

  it('describes findings and images', () => {
    expect(describeExport(result('research-vault-2026-11-24.zip', 12, 5))).toBe(
      'Exported 12 findings and 5 images as research-vault-2026-11-24.zip.',
    )
  })

  it('uses the singular for one image', () => {
    expect(describeExport(result('a.zip', 1, 1))).toBe(
      'Exported 1 finding and 1 image as a.zip.',
    )
  })
})
