/** A value written exactly as given, without quotes (used for dates). */
export interface YamlRaw {
  readonly raw: string
}

export type YamlValue = string | number | boolean | string[] | YamlRaw

export function yamlRaw(raw: string): YamlRaw {
  return { raw }
}

/**
 * Writes text as a double-quoted YAML string. JSON string rules are valid
 * YAML, so quotes, backslashes, colons, "#" and line breaks are all safe.
 * A few extra characters that YAML treats as line breaks or forbids are
 * written as \u escapes too.
 */
export function yamlString(value: string): string {
  return JSON.stringify(value).replace(
    /[\u007f-\u009f\u2028\u2029\ufeff]/g,
    (char) => `\\u${char.charCodeAt(0).toString(16).padStart(4, '0')}`,
  )
}

const PLAIN_KEY = /^[A-Za-z_][A-Za-z0-9_-]*$/
// Words YAML would read as true/false/null if left bare.
const RESERVED_KEY = /^(true|false|null|yes|no|on|off|y|n)$/i

export function yamlKey(key: string): string {
  return PLAIN_KEY.test(key) && !RESERVED_KEY.test(key) ? key : yamlString(key)
}

function yamlScalar(value: string | number | boolean | YamlRaw): string {
  if (typeof value === 'string') return yamlString(value)
  if (typeof value === 'number') return Number.isFinite(value) ? String(value) : yamlString(String(value))
  if (typeof value === 'boolean') return value ? 'true' : 'false'
  return value.raw
}

/** Builds the block of properties at the top of a note, in the order given. */
export function buildFrontmatter(properties: Array<[string, YamlValue]>): string {
  const lines = ['---']
  for (const [key, value] of properties) {
    if (Array.isArray(value)) {
      if (value.length === 0) {
        lines.push(`${yamlKey(key)}: []`)
      } else {
        lines.push(`${yamlKey(key)}:`)
        for (const entry of value) lines.push(`  - ${yamlString(entry)}`)
      }
    } else {
      lines.push(`${yamlKey(key)}: ${yamlScalar(value)}`)
    }
  }
  lines.push('---')
  return lines.join('\n')
}