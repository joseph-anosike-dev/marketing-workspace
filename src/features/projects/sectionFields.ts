import type { Section } from '@/types'

export interface FieldDef {
  key: string
  label: string
  /** If present, the field is a dropdown with these choices. */
  options?: readonly string[]
  placeholder?: string
}

// Each key is unique across all sections, so switching section in the
// form can never mix up values.
export const SECTION_FIELDS: Record<Section, FieldDef[]> = {
  market: [
    {
      key: 'observation_type',
      label: 'Type of observation',
      options: ['Demand', 'Trend', 'Market size', 'Opportunity', 'Risk', 'Other'],
    },
  ],
  competitor: [
    {
      key: 'competitor_name',
      label: 'Competitor',
      placeholder: 'Company or creator name',
    },
    {
      key: 'competitor_price',
      label: 'Price',
      placeholder: 'e.g. $27 or $9/month',
    },
  ],
  advertising: [
    {
      key: 'ad_platform',
      label: 'Platform',
      options: [
        'Facebook',
        'Instagram',
        'TikTok',
        'YouTube',
        'Google',
        'Pinterest',
        'LinkedIn',
        'X',
        'Other',
      ],
    },
    { key: 'ad_hook', label: 'Hook', placeholder: 'The opening line or angle' },
  ],
  customer: [
    {
      key: 'customer_entry_type',
      label: 'Type',
      options: ['Pain point', 'Desire', 'Objection', 'Customer quote', 'Other'],
    },
  ],
  product: [
    {
      key: 'product_type',
      label: 'Product type',
      options: [
        'eBook',
        'Course',
        'Template',
        'Printable',
        'Membership',
        'App',
        'Other',
      ],
    },
    { key: 'product_price', label: 'Price', placeholder: 'e.g. $19' },
  ],
  keyword: [
    {
      key: 'search_intent',
      label: 'Search intent',
      options: ['Informational', 'Commercial', 'Transactional', 'Navigational'],
    },
    {
      key: 'search_volume',
      label: 'Monthly searches',
      placeholder: 'Your own estimate or a tool figure',
    },
  ],
  general: [],
}

export const ALL_FIELD_KEYS: string[] = Object.values(SECTION_FIELDS)
  .flat()
  .map((field) => field.key)

/** Current values for every known field, as text ("" when missing). */
export function readFieldValues(
  metadata: Record<string, unknown>,
): Record<string, string> {
  const values: Record<string, string> = {}
  for (const key of ALL_FIELD_KEYS) {
    const value = metadata[key]
    values[key] = typeof value === 'string' ? value : ''
  }
  return values
}

/**
 * Builds the metadata to save: keeps keys this form does not know about,
 * drops the section fields of every section, then writes back only the
 * non-empty fields of the chosen section.
 */
export function buildMetadata(
  existing: Record<string, unknown>,
  section: Section,
  values: Record<string, string>,
): Record<string, unknown> {
  const next: Record<string, unknown> = { ...existing }
  for (const key of ALL_FIELD_KEYS) delete next[key]
  for (const field of SECTION_FIELDS[section]) {
    const value = (values[field.key] ?? '').trim()
    if (value) next[field.key] = value
  }
  return next
}

/** The filled-in fields of an item, ready to display. */
export function describeMetadata(
  section: Section,
  metadata: Record<string, unknown>,
): { label: string; value: string }[] {
  return SECTION_FIELDS[section].flatMap((field) => {
    const value = metadata[field.key]
    return typeof value === 'string' && value.trim()
      ? [{ label: field.label, value }]
      : []
  })
}