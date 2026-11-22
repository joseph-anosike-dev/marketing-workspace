import { z } from 'zod'
import { ITEM_KINDS, PROJECT_STATUSES, SECTIONS } from '@/types'

function isHttpUrl(value: string): boolean {
  try {
    const url = new URL(value)
    return url.protocol === 'http:' || url.protocol === 'https:'
  } catch {
    return false
  }
}

// Empty string means "no URL" and is stored as null.
const sourceUrl = z
  .string()
  .trim()
  .max(2048)
  .refine((v) => v === '' || isHttpUrl(v), {
    message: 'Enter a web address starting with http:// or https://',
  })
  .nullable()
  .transform((v) => (v ? v : null))

/* ---------- Projects ---------- */

const projectShape = {
  name: z.string().trim().min(1, 'Project name is required').max(120),
  description: z.string().trim().max(2000),
  status: z.enum(PROJECT_STATUSES),
}

export const projectCreateSchema = z.object({
  ...projectShape,
  description: projectShape.description.default(''),
  status: projectShape.status.default('active'),
})

// No defaults here, so updating one field never resets another.
export const projectUpdateSchema = z.object(projectShape).partial()

export type ProjectCreateInput = z.input<typeof projectCreateSchema>
export type ProjectUpdateInput = z.input<typeof projectUpdateSchema>

/* ---------- Research items ---------- */

const itemShape = {
  project_id: z.string().min(1).nullable(),
  section: z.enum(SECTIONS),
  kind: z.enum(ITEM_KINDS),
  title: z.string().trim().min(1, 'Title is required').max(200),
  body: z.string().max(100_000),
  source_url: sourceUrl,
  metadata: z.record(z.string(), z.unknown()),
  tags: z.array(z.string().max(60)).max(30),
}

export const itemCreateSchema = z.object({
  ...itemShape,
  project_id: itemShape.project_id.default(null),
  kind: itemShape.kind.default('note'),
  body: itemShape.body.default(''),
  source_url: itemShape.source_url.default(null),
  metadata: itemShape.metadata.default({}),
  tags: itemShape.tags.default([]),
})

export const itemUpdateSchema = z.object(itemShape).partial()

export type ItemCreateInput = z.input<typeof itemCreateSchema>
export type ItemUpdateInput = z.input<typeof itemUpdateSchema>