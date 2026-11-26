import { useMemo, useState } from 'react'

export const PAGE_SIZE = 40

/**
 * Shows a long list a page at a time. Each finding on screen costs real work
 * (images, buttons), so thousands at once would make a phone crawl.
 *
 * `resetKey` should change whenever the list is a different list (another
 * filter, sort or project); the list then starts from the first page again.
 */
export function usePaging<T>(items: readonly T[], resetKey: string, pageSize = PAGE_SIZE) {
  const [state, setState] = useState({ key: resetKey, count: pageSize })
  // A new key means a new list, so start again. Worked out here, not in an effect.
  const count = state.key === resetKey ? state.count : pageSize

  const shown = useMemo(() => items.slice(0, count), [items, count])

  return {
    shown,
    total: items.length,
    hasMore: count < items.length,
    showMore: () => setState({ key: resetKey, count: count + pageSize }),
  }
}
