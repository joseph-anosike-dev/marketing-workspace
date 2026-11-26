import type { PlaceholderValues } from './placeholders'

const FIELD: Record<string, { label: string; example: string }> = {
  niche: { label: 'Niche or topic', example: 'e.g. standing desks' },
  audience: { label: 'Audience', example: 'e.g. remote workers with back pain' },
  competitor: { label: 'Competitor', example: 'Company or creator name' },
  product: { label: 'Product', example: 'Product name' },
  platform: { label: 'Platform', example: 'e.g. Facebook, TikTok' },
  keyword: { label: 'Keyword', example: 'A search phrase' },
  price: { label: 'Price', example: 'e.g. $27 or $9/month' },
  observation: { label: 'Observation', example: 'What you noticed, in one sentence' },
}

interface PlaceholderInputsProps {
  names: readonly string[]
  values: PlaceholderValues
  onChange: (name: string, value: string) => void
}

export function PlaceholderInputs({ names, values, onChange }: PlaceholderInputsProps) {
  if (names.length === 0) return null
  return (
    <section aria-labelledby="pb-fill" className="rounded-md border p-3">
      <h2 id="pb-fill" className="text-sm font-medium">
        Fill in your details
      </h2>
      <p className="mt-0.5 text-xs text-muted-foreground">
        These are filled in below. A blank one stays as {'{name}'}.
      </p>
      <div className="mt-3 grid gap-3 sm:grid-cols-2">
        {names.map((name) => {
          const field = FIELD[name] ?? { label: name, example: '' }
          return (
            <div key={name}>
              <label htmlFor={`pb-${name}`} className="mb-1 block text-sm font-medium">
                {field.label}
              </label>
              <input
                id={`pb-${name}`}
                className="w-full rounded-md border bg-background px-3 py-2 text-sm"
                value={values[name] ?? ''}
                maxLength={200}
                placeholder={field.example}
                onChange={(e) => onChange(name, e.target.value)}
              />
            </div>
          )
        })}
      </div>
    </section>
  )
}
