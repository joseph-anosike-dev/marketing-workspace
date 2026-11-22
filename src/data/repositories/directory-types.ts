import type { Category, Pricing, Tool } from '@/types'

export interface ToolCategoryInfo {
  id: string
  name: string
  /** How the tool is used within this category. */
  use_case: string
}

export interface ToolView extends Tool {
  categories: ToolCategoryInfo[]
  bookmarked: boolean
}

export interface ToolFilter {
  categoryId?: string
  pricing?: Pricing
  kind?: Tool['kind']
  /** Matches name, descriptions and category names, ignoring case. */
  search?: string
  bookmarkedOnly?: boolean
}

export interface CategoryWithCount extends Category {
  count: number
}

export interface ToolRepository {
  listCategories(): Promise<CategoryWithCount[]>
  list(filter?: ToolFilter): Promise<ToolView[]>
  get(id: string): Promise<ToolView | undefined>
}

export interface BookmarkRepository {
  /** Adds or removes the bookmark. Returns true if the tool is now bookmarked. */
  toggle(toolId: string): Promise<boolean>
  listToolIds(): Promise<string[]>
}