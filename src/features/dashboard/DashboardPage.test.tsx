import { renderToString } from 'react-dom/server'
import { MemoryRouter } from 'react-router-dom'
import { describe, expect, it } from 'vitest'
import { DashboardPage } from './DashboardPage'

describe('DashboardPage', () => {
  it('shows the quick actions straight away, while data is loading', () => {
    const html = renderToString(
      <MemoryRouter>
        <DashboardPage />
      </MemoryRouter>,
    )
    expect(html).toContain('Dashboard')
    expect(html).toContain('Add finding')
    expect(html).toContain('New project')
    for (const href of ['/discover', '/directory', '/settings']) {
      expect(html).toContain(`href="${href}"`)
    }
    expect(html).toContain('Loading…')
  })
})
