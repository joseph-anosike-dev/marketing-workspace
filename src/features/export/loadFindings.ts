import { attachmentsRepo, projectsRepo } from '@/data/repositories'
import { formatBytes } from '@/lib/images'
import { MAX_ZIP_BYTES, ZipError } from '@/lib/zip'
import type { ResearchItemView } from '@/types'
import type { ExportFinding } from './bundle'

/**
 * Refuses an export whose images alone are already over the size limit.
 * Checking the saved sizes first means nothing large is read into memory
 * only to be thrown away.
 */
export function assertExportFits(findings: ExportFinding[]): void {
  let total = 0
  for (const finding of findings) {
    for (const attachment of finding.attachments) total += attachment.size_bytes
  }
  if (total > MAX_ZIP_BYTES) {
    throw new ZipError(
      `This export is too large (${formatBytes(total)} of images; the limit is ${formatBytes(MAX_ZIP_BYTES)}). Narrow your filters or export one project at a time.`,
    )
  }
}

/** Adds each finding's images and project name, ready to hand to the export functions. */
export async function loadExportFindings(
  items: ResearchItemView[],
): Promise<ExportFinding[]> {
  if (items.length === 0) return []

  const [attachmentsByItem, projects] = await Promise.all([
    attachmentsRepo.listForItems(items.map((item) => item.id)),
    // Archived projects are included, so their findings still name their project.
    projectsRepo.list({ includeArchived: true }),
  ])
  const projectNames = new Map(projects.map((p) => [p.id, p.name]))

  const findings = items.map((item) => ({
    item,
    attachments: attachmentsByItem.get(item.id) ?? [],
    projectName: item.project_id ? (projectNames.get(item.project_id) ?? null) : null,
  }))
  assertExportFits(findings)
  return findings
}

export async function loadExportFinding(item: ResearchItemView): Promise<ExportFinding> {
  const [finding] = await loadExportFindings([item])
  return finding
}
