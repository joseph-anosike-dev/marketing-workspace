import { useState, type FormEvent } from 'react'
import { Modal } from '@/components/Modal'
import { Button } from '@/components/ui/button'
import { itemsRepo } from '@/data/repositories'
import { describeError } from '@/lib/describeError'
import {
  SECTIONS,
  SECTION_LABELS,
  type Project,
  type ResearchItemView,
  type Section,
  type TagWithCount,
} from '@/types'
import {
  deriveKind,
  normalizeUrlInput,
  parseTags,
  tagsToText,
  toggleTagInText,
} from './formUtils'
import { SECTION_FIELDS, buildMetadata, readFieldValues } from './sectionFields'

export interface ItemSavedInfo {
  wasNew: boolean
  /** Name of the place the finding was moved to, or null if it did not move. */
  movedTo: string | null
}

interface ItemFormModalProps {
  open: boolean
  /** The finding to edit, or null to add a new one. */
  item: ResearchItemView | null
  /** The project a new finding is added to. */
  projectId: string
  defaultSection: Section
  /** Projects a finding can be moved to when editing. */
  projects: Project[]
  existingTags: TagWithCount[]
  onClose: () => void
  onSaved: (item: ResearchItemView, info: ItemSavedInfo) => void
}

const inputClass = 'w-full rounded-md border bg-background px-3 py-2 text-sm'
const labelClass = 'mb-1 block text-sm font-medium'

export function ItemFormModal(props: ItemFormModalProps) {
  return (
    <Modal
      open={props.open}
      title={props.item ? 'Edit finding' : 'Add finding'}
      onClose={props.onClose}
    >
      <ItemForm {...props} />
    </Modal>
  )
}

function ItemForm({
  item,
  projectId,
  defaultSection,
  projects,
  existingTags,
  onClose,
  onSaved,
}: ItemFormModalProps) {
  const [title, setTitle] = useState(item?.title ?? '')
  const [section, setSection] = useState<Section>(item?.section ?? defaultSection)
  const [values, setValues] = useState(() => readFieldValues(item?.metadata ?? {}))
  const [url, setUrl] = useState(item?.source_url ?? '')
  const [body, setBody] = useState(item?.body ?? '')
  const [tagsText, setTagsText] = useState(tagsToText(item?.tags ?? []))
  const [projectChoice, setProjectChoice] = useState(item?.project_id ?? '')
  const [error, setError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  const activeTags = parseTags(tagsText)

  async function submit(event: FormEvent) {
    event.preventDefault()
    setSaving(true)
    setError(null)

    const sourceUrl = normalizeUrlInput(url)
    const metadata = buildMetadata(item?.metadata ?? {}, section, values)
    const tags = parseTags(tagsText)

    try {
      let saved: ResearchItemView
      if (item) {
        saved = await itemsRepo.update(item.id, {
          title,
          section,
          project_id: projectChoice || null,
          source_url: sourceUrl,
          kind: deriveKind(item.kind, sourceUrl),
          body,
          metadata,
          tags,
        })
      } else {
        saved = await itemsRepo.create({
          title,
          section,
          project_id: projectId,
          source_url: sourceUrl,
          kind: deriveKind('note', sourceUrl),
          body,
          metadata,
          tags,
        })
      }

      let movedTo: string | null = null
      if (item && saved.project_id !== item.project_id) {
        movedTo = saved.project_id
          ? (projects.find((p) => p.id === saved.project_id)?.name ?? 'another project')
          : 'the Vault'
      }
      onSaved(saved, { wasNew: item === null, movedTo })
    } catch (e) {
      setError(describeError(e))
      setSaving(false)
    }
  }

  return (
    <form onSubmit={(event) => void submit(event)} className="space-y-4">
      <div>
        <label htmlFor="item-title" className={labelClass}>
          Title
        </label>
        <input
          id="item-title"
          className={inputClass}
          value={title}
          maxLength={200}
          placeholder="A short name for this finding"
          onChange={(e) => setTitle(e.target.value)}
        />
      </div>

      <div>
        <label htmlFor="item-section" className={labelClass}>
          Section
        </label>
        <select
          id="item-section"
          className={inputClass}
          value={section}
          onChange={(e) => setSection(e.target.value as Section)}
        >
          {SECTIONS.map((s) => (
            <option key={s} value={s}>
              {SECTION_LABELS[s]}
            </option>
          ))}
        </select>
      </div>

      {SECTION_FIELDS[section].length > 0 && (
        <div className="grid gap-4 sm:grid-cols-2">
          {SECTION_FIELDS[section].map((field) => (
            <div key={field.key}>
              <label htmlFor={`field-${field.key}`} className={labelClass}>
                {field.label}{' '}
                <span className="font-normal text-muted-foreground">(optional)</span>
              </label>
              {field.options ? (
                <select
                  id={`field-${field.key}`}
                  className={inputClass}
                  value={values[field.key] ?? ''}
                  onChange={(e) =>
                    setValues((previous) => ({
                      ...previous,
                      [field.key]: e.target.value,
                    }))
                  }
                >
                  <option value="">Not set</option>
                  {field.options.map((option) => (
                    <option key={option} value={option}>
                      {option}
                    </option>
                  ))}
                </select>
              ) : (
                <input
                  id={`field-${field.key}`}
                  className={inputClass}
                  value={values[field.key] ?? ''}
                  maxLength={200}
                  placeholder={field.placeholder}
                  onChange={(e) =>
                    setValues((previous) => ({
                      ...previous,
                      [field.key]: e.target.value,
                    }))
                  }
                />
              )}
            </div>
          ))}
        </div>
      )}

      <div>
        <label htmlFor="item-url" className={labelClass}>
          Source link{' '}
          <span className="font-normal text-muted-foreground">(optional)</span>
        </label>
        <input
          id="item-url"
          className={inputClass}
          value={url}
          maxLength={2048}
          inputMode="url"
          placeholder="https://example.com/page"
          onChange={(e) => setUrl(e.target.value)}
        />
      </div>

      <div>
        <label htmlFor="item-body" className={labelClass}>
          Notes{' '}
          <span className="font-normal text-muted-foreground">
            (optional, Markdown works)
          </span>
        </label>
        <textarea
          id="item-body"
          className={inputClass}
          rows={5}
          value={body}
          onChange={(e) => setBody(e.target.value)}
        />
      </div>

      <div>
        <label htmlFor="item-tags" className={labelClass}>
          Tags{' '}
          <span className="font-normal text-muted-foreground">
            (separate with commas)
          </span>
        </label>
        <input
          id="item-tags"
          className={inputClass}
          value={tagsText}
          placeholder="e.g. baby sleep, pricing"
          onChange={(e) => setTagsText(e.target.value)}
        />
        {existingTags.length > 0 && (
          <div className="mt-2">
            <p className="mb-1 text-xs text-muted-foreground">Your tags</p>
            <ul className="flex flex-wrap gap-1.5">
              {existingTags.slice(0, 15).map((tag) => {
                const on = activeTags.includes(tag.name)
                return (
                  <li key={tag.id}>
                    <button
                      type="button"
                      aria-pressed={on}
                      onClick={() =>
                        setTagsText((text) => toggleTagInText(text, tag.name))
                      }
                      className={
                        'min-h-8 rounded-full border px-2.5 text-xs transition-colors focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none ' +
                        (on
                          ? 'border-primary bg-primary text-primary-foreground'
                          : 'hover:bg-accent')
                      }
                    >
                      #{tag.name}
                    </button>
                  </li>
                )
              })}
            </ul>
          </div>
        )}
      </div>

      {item && (
        <div>
          <label htmlFor="item-project" className={labelClass}>
            Project
          </label>
          <select
            id="item-project"
            className={inputClass}
            value={projectChoice}
            onChange={(e) => setProjectChoice(e.target.value)}
          >
            <option value="">No project (Vault only)</option>
            {projects.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
        </div>
      )}

      {error && (
        <p role="alert" className="text-sm text-red-700">
          {error}
        </p>
      )}

      <div className="flex justify-end gap-2">
        <Button type="button" variant="outline" onClick={onClose}>
          Cancel
        </Button>
        <Button type="submit" disabled={saving}>
          {item ? 'Save changes' : 'Add finding'}
        </Button>
      </div>
    </form>
  )
}