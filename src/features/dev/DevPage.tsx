import { useCallback, useEffect, useState } from 'react'
import { ZodError } from 'zod'
import { PageHeader } from '@/components/layout/PageHeader'
import { Button } from '@/components/ui/button'
import { itemsRepo, projectsRepo, tagsRepo } from '@/data/repositories'
import { BackupPanel } from '@/features/backup/BackupPanel'
import { db } from '@/lib/db'
import {
  SECTIONS,
  SECTION_LABELS,
  type Project,
  type ResearchItemView,
  type Section,
  type TagWithCount,
} from '@/types'

const inputClass = 'w-full rounded-md border bg-background px-3 py-2 text-sm'

function describeError(err: unknown): string {
  if (err instanceof ZodError) return err.issues.map((i) => i.message).join(' · ')
  return err instanceof Error ? err.message : String(err)
}

export function DevPage() {
  const [projects, setProjects] = useState<Project[]>([])
  const [items, setItems] = useState<ResearchItemView[]>([])
  const [tags, setTags] = useState<TagWithCount[]>([])
  const [error, setError] = useState<string | null>(null)
  const [search, setSearch] = useState('')
  const [includeArchived, setIncludeArchived] = useState(false)

  const [newProjectName, setNewProjectName] = useState('')
  const [title, setTitle] = useState('')
  const [section, setSection] = useState<Section>('market')
  const [projectId, setProjectId] = useState('')
  const [url, setUrl] = useState('')
  const [tagsText, setTagsText] = useState('')
  const [body, setBody] = useState('')

  const reload = useCallback(async () => {
    try {
      const [p, i, t] = await Promise.all([
        projectsRepo.list({ includeArchived: true }),
        itemsRepo.list({ search, includeArchived }),
        tagsRepo.list({ includeArchived }),
      ])
      setProjects(p)
      setItems(i)
      setTags(t)
    } catch (e) {
      setError(describeError(e))
    }
  }, [search, includeArchived])

  useEffect(() => {
    void reload()
  }, [reload])

  async function run(action: () => Promise<unknown>) {
    setError(null)
    try {
      await action()
      await reload()
    } catch (e) {
      setError(describeError(e))
    }
  }

  const projectLabels = new Map(
    projects.map((p) => [
      p.id,
      p.status === 'archived' ? `${p.name} (archived)` : p.name,
    ]),
  )

  return (
    <>
      <PageHeader
        title="Developer tools"
        description="Temporary page for testing the data layer. It will be removed later."
      />

      {error && (
        <div
          role="alert"
          className="mb-4 rounded-md border border-red-300 bg-red-50 p-3 text-sm text-red-800"
        >
          {error}
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-2">
        <section className="space-y-4 rounded-lg border p-4">
          <h2 className="font-semibold">1. Projects</h2>
          <form
            className="flex gap-2"
            onSubmit={(e) => {
              e.preventDefault()
              void run(async () => {
                await projectsRepo.create({ name: newProjectName })
                setNewProjectName('')
              })
            }}
          >
            <input
              aria-label="New project name"
              className={inputClass}
              placeholder="Project name"
              value={newProjectName}
              onChange={(e) => setNewProjectName(e.target.value)}
            />
            <Button type="submit">Create</Button>
          </form>

          <ul className="space-y-2">
            {projects.length === 0 && (
              <li className="text-sm text-muted-foreground">No projects yet.</li>
            )}
            {projects.map((p) => (
              <li key={p.id} className="rounded-md border p-3 text-sm">
                <div className="font-medium">
                  {p.name}{' '}
                  <span className="font-normal text-muted-foreground">({p.status})</span>
                </div>
                <div className="mt-2 flex flex-wrap gap-2">
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      const name = window.prompt('New project name', p.name)
                      if (name !== null) void run(() => projectsRepo.update(p.id, { name }))
                    }}
                  >
                    Rename
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={() =>
                      void run(() =>
                        projectsRepo.update(p.id, {
                          status: p.status === 'active' ? 'archived' : 'active',
                        }),
                      )
                    }
                  >
                    {p.status === 'active' ? 'Archive' : 'Restore'}
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      if (window.confirm('Delete project? Its items move to the Vault.')) {
                        void run(() => projectsRepo.remove(p.id))
                      }
                    }}
                  >
                    Delete (keep items)
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant="destructive"
                    onClick={() => {
                      if (window.confirm('Delete project AND all its items?')) {
                        void run(() => projectsRepo.remove(p.id, { deleteItems: true }))
                      }
                    }}
                  >
                    Delete + items
                  </Button>
                </div>
              </li>
            ))}
          </ul>
        </section>

        <section className="space-y-3 rounded-lg border p-4">
          <h2 className="font-semibold">2. Add a research item</h2>
          <form
            className="space-y-3"
            onSubmit={(e) => {
              e.preventDefault()
              void run(async () => {
                await itemsRepo.create({
                  title,
                  section,
                  project_id: projectId || null,
                  source_url: url,
                  kind: url.trim() ? 'link' : 'note',
                  tags: tagsText.split(','),
                  body,
                })
                setTitle('')
                setUrl('')
                setTagsText('')
                setBody('')
              })
            }}
          >
            <input
              aria-label="Item title"
              className={inputClass}
              placeholder="Title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
            />
            <div className="grid grid-cols-2 gap-2">
              <select
                aria-label="Section"
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
              <select
                aria-label="Project"
                className={inputClass}
                value={projectId}
                onChange={(e) => setProjectId(e.target.value)}
              >
                <option value="">No project (Vault only)</option>
                {projects.map((p) => (
                  <option key={p.id} value={p.id}>
                    {projectLabels.get(p.id)}
                  </option>
                ))}
              </select>
            </div>
            <input
              aria-label="Source URL"
              className={inputClass}
              placeholder="Source URL (optional), e.g. https://example.com"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
            />
            <input
              aria-label="Tags"
              className={inputClass}
              placeholder="Tags, separated by commas"
              value={tagsText}
              onChange={(e) => setTagsText(e.target.value)}
            />
            <textarea
              aria-label="Notes"
              className={inputClass}
              rows={3}
              placeholder="Notes (Markdown allowed)"
              value={body}
              onChange={(e) => setBody(e.target.value)}
            />
            <Button type="submit">Save item</Button>
          </form>
        </section>
      </div>

      <section className="mt-6 space-y-3 rounded-lg border p-4">
        <h2 className="font-semibold">3. Saved items ({items.length})</h2>
        <input
          aria-label="Search items"
          className={inputClass}
          placeholder="Search titles, notes, URLs and tags"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={includeArchived}
            onChange={(e) => setIncludeArchived(e.target.checked)}
          />
          Include items from archived projects
        </label>
        <ul className="space-y-2">
          {items.length === 0 && (
            <li className="text-sm text-muted-foreground">Nothing found.</li>
          )}
          {items.map((item) => (
            <li key={item.id} className="rounded-md border p-3 text-sm">
              <div className="font-medium">{item.title}</div>
              <div className="text-muted-foreground">
                {SECTION_LABELS[item.section]} ·{' '}
                {item.project_id
                  ? (projectLabels.get(item.project_id) ?? 'unknown project')
                  : 'No project'}{' '}
                · {item.kind}
              </div>
              {item.source_url && (
                <a
                  href={item.source_url}
                  target="_blank"
                  rel="noreferrer noopener"
                  className="break-all underline"
                >
                  {item.source_url}
                </a>
              )}
              {item.body && <p className="mt-1 whitespace-pre-wrap">{item.body}</p>}
              {item.tags.length > 0 && (
                <div className="mt-1">{item.tags.map((t) => `#${t}`).join(' ')}</div>
              )}
              <div className="mt-2 flex gap-2">
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    const next = window.prompt('New title', item.title)
                    if (next !== null) void run(() => itemsRepo.update(item.id, { title: next }))
                  }}
                >
                  Rename
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant="destructive"
                  onClick={() => void run(() => itemsRepo.remove(item.id))}
                >
                  Delete
                </Button>
              </div>
            </li>
          ))}
        </ul>
      </section>

      <section className="mt-6 space-y-3 rounded-lg border p-4">
        <h2 className="font-semibold">4. Tags</h2>
        <p className="text-sm">
          {tags.length === 0
            ? 'No tags yet.'
            : tags.map((t) => `#${t.name} (${t.count})`).join('  ')}
        </p>
        <Button
          type="button"
          variant="destructive"
          onClick={() => {
            if (window.confirm('Erase ALL local data in this browser?')) {
              void run(() => Promise.all(db.tables.map((t) => t.clear())))
            }
          }}
        >
          Wipe all local data
        </Button>
      </section>

      <div className="mt-6">
        <BackupPanel title="5. Backup and restore" onRestored={() => void reload()} />
      </div>
    </>
  )
}