import type { Tool } from '@/types'

export interface SeedToolCategory {
  category_id: string
  use_case: string
}

/** A tool as written in the dataset, with the categories it belongs to. */
export type SeedTool = Tool & { categories: SeedToolCategory[] }