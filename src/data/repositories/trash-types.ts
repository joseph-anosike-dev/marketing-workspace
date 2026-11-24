import type { Project, ResearchItem } from '@/types'

/** A deleted project. Findings deleted together with it are counted here, not listed separately. */
export interface TrashedProject {
  project: Project
  /** Findings that were deleted together with this project. */
  itemCount: number
  imageCount: number
  imageBytes: number
}

/** A deleted finding that was deleted on its own. */
export interface TrashedItem {
  item: ResearchItem
  /** Name of the project it belonged to, if that project still exists. */
  projectName: string | null
  /** True when that project is in Trash too. */
  projectInTrash: boolean
  imageCount: number
  imageBytes: number
}

export interface TrashContents {
  projects: TrashedProject[]
  items: TrashedItem[]
  /** Images held by everything in Trash. */
  imageCount: number
  imageBytes: number
}

export interface TrashRepository {
  /** Everything in Trash, newest deletion first. */
  list(): Promise<TrashContents>
  /**
   * Puts a finding back. If its project is in Trash or gone, the finding
   * goes to the Vault instead and movedToVault is true.
   */
  restoreItem(id: string): Promise<{ movedToVault: boolean }>
  /** Puts a project back, with the findings that were deleted together with it. */
  restoreProject(id: string): Promise<{ restoredItems: number }>
  /** Permanently deletes a finding in Trash, with its images and tag links. */
  purgeItem(id: string): Promise<void>
  /** Permanently deletes a project in Trash and the findings deleted together with it. */
  purgeProject(id: string): Promise<void>
  /** Permanently deletes everything in Trash. */
  empty(): Promise<{ projects: number; items: number }>
}
