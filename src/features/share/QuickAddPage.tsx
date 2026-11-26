import { App as CapacitorApp } from '@capacitor/app'
import { Capacitor } from '@capacitor/core'
import { CheckCircle2 } from 'lucide-react'
import { useEffect, useState, type FormEvent } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { Button, buttonVariants } from '@/components/ui/button'
import { attachmentsRepo, itemsRepo, projectsRepo, tagsRepo } from '@/data/repositories'
import { describeError } from '@/lib/describeError'
import { plural } from '@/lib/format'
import { prepareImage } from '@/lib/imageProcessing'
import { MAX_ATTACHMENTS_PER_ITEM } from '@/lib/images'
import {
  SECTIONS,
  SECTION_LABELS,
  type Project,
  type ResearchItemView,
  type Section,
  type TagWithCount,
} from '@/types'
import { ImagePicker, type PendingImage } from '@/features/projects/ImagePicker'
import {
  deriveKind,
  normalizeUrlInput,
  parseTags,
  toggleTagInText,
} from '@/features/projects/formUtils'
import { SECTION_FIELDS, buildMetadata } from '@/features/projects/sectionFields'
import { lastProjectId, lastSection, rememberChoices } from './quickAddPrefs'
import { loadSharedFile } from './loadSharedFile'
import { fallbackTitle, type IncomingShare } from './shareContent'

const NO_SHARE: IncomingShare = { title: '', sourceUrl: '', body: '', images: [], skipped: 0 }
const NO_REMOVALS: ReadonlySet<string> = new Set()
const inputClass = 'w-full rounded-md border bg-background px-3 py-2 text-sm'
const labelClass = 'mb-1 block text-sm font-medium'

/** The page other apps open when something is shared to Re-Search. Also reachable at /add. */
export function QuickAddPage() {
  const location = useLocation()
  const share = (location.state as { share?: IncomingShare } | null)?.share ?? NO_SHARE
  // A new share arrives with a new location key, which starts the form afresh.
  return <QuickAddForm key={location.key} share={share} />
}

function QuickAddForm({ share }: { share: IncomingShare }) {
  const navigate = useNavigate()
  const [title, setTitle] = useState(share.title)
  const [section, setSection] = useState<Section>(lastSection)
  const [projectChoice, setProjectChoice] = useState(lastProjectId)
  const [tagsText, setTagsText] = useState('')
  const [url, setUrl] = useState(share.sourceUrl)
  const [body, setBody] = useState(share.body)
  const [values, setValues] = useState<Record<string, string>>({})

  const [projects, setProjects] = useState<Project[]>([])
  const [existingTags, setExistingTags] = useState<TagWithCount[]>([])

  const [pending, setPending] = useState<PendingImage[]>([])
  const [processing, setProcessing] = useState(share.images.length > 0)
  const [imageMessages, setImageMessages] = useState<string[]>(
    share.skipped > 0
      ? [`${plural(share.skipped, 'shared file')} could not be added. Only PNG, JPEG, WebP and GIF images work.`]
      : [],
  )

  const [error, setError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  // Once the finding exists, a retry updates it instead of creating a copy.
  const [savedItem, setSavedItem] = useState<ResearchItemView | null>(null)
  const [done, setDone] = useState<{ place: string } | null>(null)

  useEffect(() => {
    let cancelled = false
    Promise.all([projectsRepo.list(), tagsRepo.list()])
      .then(([p, t]) => {
        if (cancelled) return
        setProjects(p)
        setExistingTags(t)
        // Forget a remembered project that has been deleted or archived.
        setProjectChoice((choice) => (p.some((x) => x.id === choice) ? choice : ''))
      })
      .catch((e: unknown) => {
        if (!cancelled) setError(describeError(e))
      })
    return () => {
      cancelled = true
    }
  }, [])

  // Read and shrink the shared screenshots once, when the page opens.
  useEffect(() => {
    if (share.images.length === 0) return
    let cancelled = false
    void (async () => {
      const added: PendingImage[] = []
      const messages: string[] = []
      for (const ref of share.images.slice(0, MAX_ATTACHMENTS_PER_ITEM)) {
        try {
          const file = await loadSharedFile(ref)
          added.push({ key: crypto.randomUUID(), attachment: await prepareImage(file) })
        } catch (e) {
          messages.push(describeError(e))
        }
      }
      if (share.images.length > MAX_ATTACHMENTS_PER_ITEM) {
        messages.push(`Only the first ${MAX_ATTACHMENTS_PER_ITEM} images were added.`)
      }
      if (cancelled) return
      setPending(added)
      setImageMessages((previous) => [...previous, ...messages])
      setProcessing(false)
    })()
    return () => {
      cancelled = true
    }
  }, [share])

  async function addFiles(files: File[]) {
    if (files.length === 0 || processing) return
    const room = Math.max(MAX_ATTACHMENTS_PER_ITEM - pending.length, 0)
    const messages: string[] = []
    if (room === 0) messages.push(`A finding can have at most ${MAX_ATTACHMENTS_PER_ITEM} images.`)
    else if (files.length > room) {
      messages.push(`Only the first ${plural(room, 'image')} were added (limit ${MAX_ATTACHMENTS_PER_ITEM}).`)
    }
    setProcessing(true)
    const added: PendingImage[] = []
    for (const file of files.slice(0, room)) {
      try {
        added.push({ key: crypto.randomUUID(), attachment: await prepareImage(file) })
      } catch (e) {
        messages.push(describeError(e))
      }
    }
    setPending((previous) => [...previous, ...added])
    setImageMessages(messages)
    setProcessing(false)
  }

  async function submit(event: FormEvent) {
    event.preventDefault()
    setSaving(true)
    setError(null)

    const sourceUrl = normalizeUrlInput(url)
    const fields = {
      title: title.trim() || savedItem?.title || fallbackTitle(pending.length > 0),
      section,
      project_id: projectChoice || null,
      source_url: sourceUrl,
      kind: deriveKind('note', sourceUrl),
      body,
      metadata: buildMetadata(savedItem?.metadata ?? {}, section, values),
      tags: parseTags(tagsText),
    }

    let saved: ResearchItemView
    try {
      saved = savedItem
        ? await itemsRepo.update(savedItem.id, fields)
        : await itemsRepo.create(fields)
      setSavedItem(saved)
    } catch (e) {
      setError(describeError(e))
      setSaving(false)
      return
    }

    if (pending.length > 0) {
      try {
        // All or nothing, so a failed attempt added no images and a retry is safe.
        await attachmentsRepo.apply(saved.id, {
          add: pending.map((p) => p.attachment),
          removeIds: [],
        })
        setPending([])
      } catch (e) {
        setError(
          `Your finding was saved, but its images could not be added: ${describeError(e)}. ` +
            'Press Save finding to try the images again.',
        )
        setSaving(false)
        return
      }
    }

    rememberChoices(section, projectChoice)
    const place = projects.find((p) => p.id === saved.project_id)?.name ?? 'the Vault'
    setSaving(false)
    setDone({ place })
  }

  function leaveToPreviousApp() {
    // Returns to the app the share came from (Android only).
    void CapacitorApp.minimizeApp().catch(() => undefined)
    navigate('/', { replace: true })
  }

  if (done) {
    return (
      <div className="mx-auto max-w-md space-y-4 py-6 text-center">
        <CheckCircle2 className="mx-auto size-10 text-primary" aria-hidden="true" />
        <h1 className="text-xl font-semibold" role="status">
          Saved to {done.place}
        </h1>
        <div className="flex flex-col gap-2">
          {Capacitor.isNativePlatform() && (
            <Button type="button" className="h-11" onClick={leaveToPreviousApp}>
              Back to what I was doing
            </Button>
          )}
          <Link to="/add" replace className={buttonVariants({ variant: 'outline' }) + ' h-11'}>
            Add another
          </Link>
          <Link to="/vault" className={buttonVariants({ variant: 'outline' }) + ' h-11'}>
            Open the Vault
          </Link>
        </div>
      </div>
    )
  }

  const activeTags = parseTags(tagsText)
  const detailsOpen = Boolean(share.sourceUrl || share.body)

  return (
    <div className="mx-auto max-w-xl">
      <h1 className="text-2xl font-semibold">Quick save</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        Save it now, sort it later. Only the picture or a note is needed.
      </p>

      <form onSubmit={(event) => void submit(event)} className="mt-5 space-y-4">
        <ImagePicker
          existing={[]}
          removedIds={NO_REMOVALS}
          pending={pending}
          loadingExisting={false}
          processing={processing}
          messages={imageMessages}
          onFiles={(files) => void addFiles(files)}
          onToggleExisting={() => undefined}
          onRemovePending={(key) => setPending((previous) => previous.filter((p) => p.key !== key))}
        />

        <div>
          <label htmlFor="quick-title" className={labelClass}>
            Title <span className="font-normal text-muted-foreground">(optional)</span>
          </label>
          <input
            id="quick-title"
            className={inputClass}
            value={title}
            maxLength={200}
            placeholder="Left blank, it is named by date and time"
            onChange={(e) => setTitle(e.target.value)}
          />
        </div>

        <div>
          <label htmlFor="quick-section" className={labelClass}>
            Section
          </label>
          <select
            id="quick-section"
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

        <div>
          <label htmlFor="quick-tags" className={labelClass}>
            Tags <span className="font-normal text-muted-foreground">(separate with commas)</span>
          </label>
          <input
            id="quick-tags"
            className={inputClass}
            value={tagsText}
            placeholder="e.g. baby sleep, pricing"
            onChange={(e) => setTagsText(e.target.value)}
          />
          {existingTags.length > 0 && (
            <ul className="mt-2 flex flex-wrap gap-1.5" aria-label="Your tags">
              {existingTags.slice(0, 15).map((tag) => {
                const on = activeTags.includes(tag.name)
                return (
                  <li key={tag.id}>
                    <button
                      type="button"
                      aria-pressed={on}
                      onClick={() => setTagsText((text) => toggleTagInText(text, tag.name))}
                      className={
                        'min-h-8 rounded-full border px-2.5 text-xs transition-colors focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none ' +
                        (on ? 'border-primary bg-primary text-primary-foreground' : 'hover:bg-accent')
                      }
                    >
                      #{tag.name}
                    </button>
                  </li>
                )
              })}
            </ul>
          )}
        </div>

        <div>
          <label htmlFor="quick-project" className={labelClass}>
            Project
          </label>
          <select
            id="quick-project"
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

        <details open={detailsOpen} className="rounded-md border px-3 py-2">
          <summary className="cursor-pointer py-1 text-sm font-medium">
            More details: link, notes and {SECTION_LABELS[section]} fields
          </summary>
          <div className="mt-3 space-y-4 pb-2">
            {SECTION_FIELDS[section].map((field) => (
              <div key={field.key}>
                <label htmlFor={`quick-${field.key}`} className={labelClass}>
                  {field.label}
                </label>
                {field.options ? (
                  <select
                    id={`quick-${field.key}`}
                    className={inputClass}
                    value={values[field.key] ?? ''}
                    onChange={(e) => setValues((v) => ({ ...v, [field.key]: e.target.value }))}
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
                    id={`quick-${field.key}`}
                    className={inputClass}
                    value={values[field.key] ?? ''}
                    maxLength={200}
                    placeholder={field.placeholder}
                    onChange={(e) => setValues((v) => ({ ...v, [field.key]: e.target.value }))}
                  />
                )}
              </div>
            ))}

            <div>
              <label htmlFor="quick-url" className={labelClass}>
                Source link
              </label>
              <input
                id="quick-url"
                className={inputClass}
                value={url}
                maxLength={2048}
                inputMode="url"
                placeholder="https://example.com/page"
                onChange={(e) => setUrl(e.target.value)}
              />
            </div>

            <div>
              <label htmlFor="quick-body" className={labelClass}>
                Notes <span className="font-normal text-muted-foreground">(Markdown works)</span>
              </label>
              <textarea
                id="quick-body"
                className={inputClass}
                rows={5}
                value={body}
                onChange={(e) => setBody(e.target.value)}
              />
            </div>
          </div>
        </details>

        {error && (
          <p role="alert" className="text-sm text-red-700">
            {error}
          </p>
        )}

        <div className="flex justify-end gap-2">
          <Button type="button" variant="outline" className="h-11" onClick={() => navigate(-1)}>
            Cancel
          </Button>
          <Button type="submit" className="h-11" disabled={saving || processing}>
            {saving ? 'Saving…' : 'Save finding'}
          </Button>
        </div>
      </form>
    </div>
  )
}
