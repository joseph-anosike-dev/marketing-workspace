import { useState, type FormEvent } from 'react'
import { Modal } from '@/components/Modal'
import { Button } from '@/components/ui/button'
import { projectsRepo } from '@/data/repositories'
import { describeError } from '@/lib/describeError'
import type { Project } from '@/types'

interface ProjectFormModalProps {
  open: boolean
  /** The project to edit, or null to create a new one. */
  project: Project | null
  onClose: () => void
  onSaved: (project: Project, wasNew: boolean) => void
}

const inputClass = 'w-full rounded-md border bg-background px-3 py-2 text-sm'

export function ProjectFormModal({
  open,
  project,
  onClose,
  onSaved,
}: ProjectFormModalProps) {
  return (
    <Modal
      open={open}
      title={project ? 'Edit project' : 'New project'}
      onClose={onClose}
    >
      <ProjectForm project={project} onCancel={onClose} onSaved={onSaved} />
    </Modal>
  )
}

function ProjectForm({
  project,
  onCancel,
  onSaved,
}: {
  project: Project | null
  onCancel: () => void
  onSaved: (project: Project, wasNew: boolean) => void
}) {
  const [name, setName] = useState(project?.name ?? '')
  const [description, setDescription] = useState(project?.description ?? '')
  const [error, setError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  async function submit(event: FormEvent) {
    event.preventDefault()
    setSaving(true)
    setError(null)
    try {
      const saved = project
        ? await projectsRepo.update(project.id, { name, description })
        : await projectsRepo.create({ name, description })
      onSaved(saved, project === null)
    } catch (e) {
      setError(describeError(e))
      setSaving(false)
    }
  }

  return (
    <form onSubmit={(event) => void submit(event)} className="space-y-4">
      <div>
        <label htmlFor="project-name" className="mb-1 block text-sm font-medium">
          Name
        </label>
        <input
          id="project-name"
          className={inputClass}
          value={name}
          maxLength={120}
          autoFocus
          placeholder="e.g. First-Time Mothers Digital Products"
          onChange={(e) => setName(e.target.value)}
        />
      </div>

      <div>
        <label
          htmlFor="project-description"
          className="mb-1 block text-sm font-medium"
        >
          Description <span className="font-normal text-muted-foreground">(optional)</span>
        </label>
        <textarea
          id="project-description"
          className={inputClass}
          rows={3}
          maxLength={2000}
          value={description}
          onChange={(e) => setDescription(e.target.value)}
        />
      </div>

      {error && (
        <p role="alert" className="text-sm text-red-700">
          {error}
        </p>
      )}

      <div className="flex justify-end gap-2">
        <Button type="button" variant="outline" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit" disabled={saving}>
          {project ? 'Save changes' : 'Create project'}
        </Button>
      </div>
    </form>
  )
}