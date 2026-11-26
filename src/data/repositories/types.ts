import type {
  ItemCreateInput,
  ItemUpdateInput,
  ProjectCreateInput,
  ProjectUpdateInput,
} from '@/lib/schemas'
import type {
  ItemKind,
  Project,
  ResearchItemView,
  Section,
  TagWithCount,
} from '@/types'

export interface ItemFilter {
  /** A project id, or null for items that are not in any project. */
  projectId?: string | null
  section?: Section
  kind?: ItemKind
  tag?: string
  search?: string
  /**
   * Include items that belong to archived projects. Default: false.
   * Ignored when projectId is a specific project, so an archived
   * project still shows its own items when opened directly.
   */
  includeArchived?: boolean
}

export interface ProjectRepository {
  list(options?: { includeArchived?: boolean }): Promise<Project[]>
  get(id: string): Promise<Project | undefined>
  create(input: ProjectCreateInput): Promise<Project>
  update(id: string, patch: ProjectUpdateInput): Promise<Project>
  remove(id: string, options?: { deleteItems?: boolean }): Promise<void>
}

export interface ResearchItemRepository {
  list(filter?: ItemFilter): Promise<ResearchItemView[]>
  /** How many findings there are, the same as list().length but much cheaper. */
  count(options?: { includeArchived?: boolean }): Promise<number>
  get(id: string): Promise<ResearchItemView | undefined>
  create(input: ItemCreateInput): Promise<ResearchItemView>
  update(id: string, patch: ItemUpdateInput): Promise<ResearchItemView>
  remove(id: string): Promise<void>
}

export interface TagRepository {
  /** Tags in use, with counts. Items in archived projects are excluded by default. */
  list(options?: { includeArchived?: boolean }): Promise<TagWithCount[]>
  /**
   * Renames a tag. If a tag with the new name already exists, the two are
   * merged into it. Returns the cleaned-up name and whether a merge happened.
   */
  rename(id: string, newName: string): Promise<{ name: string; merged: boolean }>
  /** Removes a tag from every finding and deletes it. The findings are kept. */
  remove(id: string): Promise<void>
}