import { renderToString } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import { ShowMore } from '@/components/ShowMore'
import { PAGE_SIZE, usePaging } from './usePaging'

function List({ count }: { count: number }) {
  const items = Array.from({ length: count }, (_, i) => i)
  const paging = usePaging(items, 'a')
  return (
    <div>
      <ul>
        {paging.shown.map((n) => (
          <li key={n}>row</li>
        ))}
      </ul>
      <ShowMore shown={paging.shown.length} total={paging.total} onClick={paging.showMore} />
    </div>
  )
}

const rows = (html: string) => (html.match(/<li>/g) ?? []).length
// The server renderer puts invisible markers between pieces of text.
const text = (html: string) => html.replace(/<!-- -->/g, '')

describe('usePaging', () => {
  it('shows only the first page of a long list, and offers more', () => {
    const html = renderToString(<List count={1000} />)
    expect(rows(html)).toBe(PAGE_SIZE)
    expect(html).toContain('Show more')
    expect(text(html)).toContain(`Showing ${PAGE_SIZE} of 1,000`)
  })

  it('shows a short list in full, with no button', () => {
    const html = renderToString(<List count={PAGE_SIZE - 1} />)
    expect(rows(html)).toBe(PAGE_SIZE - 1)
    expect(html).not.toContain('Show more')
  })

  it('treats a list of exactly one page as complete', () => {
    const html = renderToString(<List count={PAGE_SIZE} />)
    expect(rows(html)).toBe(PAGE_SIZE)
    expect(html).not.toContain('Show more')
  })
})
