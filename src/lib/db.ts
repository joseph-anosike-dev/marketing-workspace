import Dexie, { type EntityTable, type Table } from 'dexie'
import type {
  Attachment,
  Bookmark,
  Category,
  Project,
  ResearchItem,
  ResearchItemTag,
  Tag,
  Tool,
  ToolCategory,
} from '@/types'

export const db = new Dexie('marketing-workspace') as Dexie & {
  categories: EntityTable<Category, 'id'>
  tools: EntityTable<Tool, 'id'>
  tool_categories: Table<ToolCategory, [string, string]>
  bookmarks: EntityTable<Bookmark, 'id'>
  projects: EntityTable<Project, 'id'>
  research_items: EntityTable<ResearchItem, 'id'>
  tags: EntityTable<Tag, 'id'>
  research_item_tags: Table<ResearchItemTag, [string, string]>
  attachments: EntityTable<Attachment, 'id'>
}

// Only the first column is the primary key; the rest are searchable indexes.
// "&" means the value must be unique.
db.version(1).stores({
  categories: 'id, position',
  tools: 'id, name, pricing, kind',
  tool_categories: '[tool_id+category_id], tool_id, category_id',
  bookmarks: 'id, &[owner_id+tool_id]',
  projects: 'id, owner_id, status, updated_at',
  research_items: 'id, owner_id, project_id, section, kind, updated_at',
  tags: 'id, &[owner_id+name]',
  research_item_tags: '[item_id+tag_id], item_id, tag_id',
  attachments: 'id, item_id',
})