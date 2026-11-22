import { Button } from '@/components/ui/button'
import type { CategoryWithCount } from '@/data/repositories/directory-types'
import { cn } from '@/lib/utils'
import type { DirectoryFilters } from './filters'
import { PRICING_OPTIONS } from './labels'

interface FiltersPanelProps {
  id: string
  className?: string
  categories: CategoryWithCount[]
  totalTools: number
  savedCount: number
  filters: DirectoryFilters
  canClear: boolean
  onChange: (patch: Partial<DirectoryFilters>) => void
  onClear: () => void
}

function CategoryButton({
  label,
  count,
  active,
  onClick,
}: {
  label: string
  count: number
  active: boolean
  onClick: () => void
}) {
  return (
    <button
      type="button"
      aria-pressed={active}
      onClick={onClick}
      className={cn(
        'flex min-h-9 w-full items-center justify-between gap-2 rounded-md px-2.5 py-1.5 text-left text-sm transition-colors hover:bg-accent focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none',
        active && 'bg-accent font-medium text-accent-foreground',
      )}
    >
      <span>{label}</span>
      <span className="text-xs text-muted-foreground">{count}</span>
    </button>
  )
}

function RadioGroup({
  legend,
  name,
  value,
  options,
  onChange,
}: {
  legend: string
  name: string
  value: string
  options: { value: string; label: string }[]
  onChange: (value: string) => void
}) {
  return (
    <fieldset>
      <legend className="mb-1 text-sm font-semibold">{legend}</legend>
      {options.map((option) => (
        <label
          key={option.value}
          className="flex min-h-9 cursor-pointer items-center gap-2 text-sm"
        >
          <input
            type="radio"
            name={name}
            value={option.value}
            checked={value === option.value}
            onChange={() => onChange(option.value)}
            className="size-4"
          />
          {option.label}
        </label>
      ))}
    </fieldset>
  )
}

export function FiltersPanel({
  id,
  className,
  categories,
  totalTools,
  savedCount,
  filters,
  canClear,
  onChange,
  onClear,
}: FiltersPanelProps) {
  return (
    <div
      id={id}
      className={cn('space-y-5 rounded-lg border bg-card p-4', className)}
    >
      <section>
        <h2 className="mb-2 text-sm font-semibold">Category</h2>
        <ul className="max-h-72 space-y-0.5 overflow-y-auto pr-1">
          <li>
            <CategoryButton
              label="All categories"
              count={totalTools}
              active={filters.categoryId === ''}
              onClick={() => onChange({ categoryId: '' })}
            />
          </li>
          {categories.map((category) => (
            <li key={category.id}>
              <CategoryButton
                label={category.name}
                count={category.count}
                active={filters.categoryId === category.id}
                onClick={() => onChange({ categoryId: category.id })}
              />
            </li>
          ))}
        </ul>
      </section>

      <div>
        <RadioGroup
          legend="Pricing"
          name="directory-pricing"
          value={filters.pricing}
          options={[{ value: '', label: 'Any' }, ...PRICING_OPTIONS]}
          onChange={(value) =>
            onChange({ pricing: value as DirectoryFilters['pricing'] })
          }
        />
        <p className="mt-1 text-xs text-muted-foreground">
          Pricing shows as Unverified until it has been checked.
        </p>
      </div>

      <RadioGroup
        legend="Type"
        name="directory-kind"
        value={filters.kind}
        options={[
          { value: '', label: 'Tools and techniques' },
          { value: 'tool', label: 'Tools only' },
          { value: 'technique', label: 'Techniques only' },
        ]}
        onChange={(value) => onChange({ kind: value as DirectoryFilters['kind'] })}
      />

      <label className="flex min-h-9 cursor-pointer items-center gap-2 text-sm font-medium">
        <input
          type="checkbox"
          checked={filters.savedOnly}
          onChange={(e) => onChange({ savedOnly: e.target.checked })}
          className="size-4"
        />
        Saved only ({savedCount})
      </label>

      <Button
        type="button"
        variant="outline"
        size="sm"
        disabled={!canClear}
        onClick={onClear}
      >
        Clear filters
      </Button>
    </div>
  )
}