import { useState } from 'react'
import type { PlaceholderValues } from './placeholders'
import { loadProgress, loadValues, saveProgress, saveValues } from './storage'

/** The niche, audience and so on, shared by every entry and remembered between visits. */
export function usePlaceholderValues() {
  const [values, setValues] = useState<PlaceholderValues>(loadValues)

  function setValue(name: string, value: string) {
    const next = { ...values, [name]: value }
    setValues(next)
    saveValues(next)
  }

  return [values, setValue] as const
}

/** Which checklist rows are ticked. Kept on the phone so it survives leaving the app to research. */
export function useChecklistProgress(entryId: string, total: number) {
  const [done, setDone] = useState<number[]>(() => loadProgress(entryId, total))

  function toggle(index: number) {
    const next = done.includes(index)
      ? done.filter((i) => i !== index)
      : [...done, index].sort((a, b) => a - b)
    setDone(next)
    saveProgress(entryId, next)
  }

  function reset() {
    setDone([])
    saveProgress(entryId, [])
  }

  return { done, toggle, reset }
}
