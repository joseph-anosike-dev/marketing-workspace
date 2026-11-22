export const SECTIONS = [
  'market',
  'competitor',
  'advertising',
  'customer',
  'product',
  'keyword',
  'general',
] as const
export type Section = (typeof SECTIONS)[number]

export const SECTION_LABELS: Record<Section, string> = {
  market: 'Market Research',
  competitor: 'Competitor Research',
  advertising: 'Advertising Research',
  customer: 'Customer Research',
  product: 'Product Research',
  keyword: 'Keyword Research',
  general: 'General Notes',
}

export const ITEM_KINDS = ['note', 'link', 'image'] as const
export type ItemKind = (typeof ITEM_KINDS)[number]

export const PROJECT_STATUSES = ['active', 'archived'] as const
export type ProjectStatus = (typeof PROJECT_STATUSES)[number]

export const PRICING_LABELS = ['free', 'freemium', 'paid', 'unverified'] as const
export type Pricing = (typeof PRICING_LABELS)[number]

/** Fields shared by user-owned content. Timestamps are ISO 8601 strings. */
export interface BaseRecord {
  id: string
  owner_id: string
  created_at: string
  updated_at: string
  deleted_at: string | null
}

export interface Project extends BaseRecord {
  name: string
  description: string
  status: ProjectStatus
}

export interface ResearchItem extends BaseRecord {
  project_id: string | null
  section: Section
  kind: ItemKind
  title: string
  body: string
  source_url: string | null
  metadata: Record<string, unknown>
}

/** A research item plus its tag names (tags are stored in a join table). */
export type ResearchItemView = ResearchItem & { tags: string[] }

export interface Tag {
  id: string
  owner_id: string
  name: string
  created_at: string
}

export type TagWithCount = Tag & { count: number }

export interface ResearchItemTag {
  item_id: string
  tag_id: string
}

/** Directory data (used from Stage 4). Shared reference data, not user-owned. */
export interface Category {
  id: string
  name: string
  position: number
}

export interface Tool {
  id: string
  name: string
  use_case: string
  url: string
  pricing: Pricing
  kind: 'tool' | 'technique'
}

export interface ToolCategory {
  tool_id: string
  category_id: string
  use_case: string

}

export interface Bookmark {
  id: string
  owner_id: string
  tool_id: string
  created_at: string
}

/** Screenshots and images (used from Stage 7). */
export interface Attachment {
  id: string
  owner_id: string
  item_id: string
  file_name: string
  mime_type: string
  size_bytes: number
  blob: Blob | null
  storage_path: string | null
  created_at: string
}