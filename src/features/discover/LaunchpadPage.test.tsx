import { renderToString } from 'react-dom/server'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { describe, expect, it } from 'vitest'
import { DiscoverPage } from './DiscoverPage'
import { LaunchpadPage } from './LaunchpadPage'

function render(url: string): string {
  return renderToString(
    <MemoryRouter initialEntries={[url]}>
      <Routes>
        <Route path="/discover" element={<DiscoverPage />} />
        <Route path="/discover/:section" element={<LaunchpadPage />} />
      </Routes>
    </MemoryRouter>,
  )
}

describe('Discover pages', () => {
  it('lists every research type', () => {
    const html = render('/discover')
    for (const path of ['market', 'competitor', 'advertising', 'customer', 'product', 'keyword']) {
      expect(html).toContain(`href="/discover/${path}"`)
    }
    expect(html).not.toContain('/discover/general')
  })

  it('opens external links safely, with the search already filled in', () => {
    const html = render('/discover/market?q=solar%20panels%20%26%20batteries')
    expect(html).toContain('trends.google.com/trends/explore?q=solar%20panels%20%26%20batteries')
    expect(html).toContain('target="_blank"')
    expect(html).toContain('rel="noopener noreferrer"')
    expect(html).toContain('in a new tab')
  })

  it('turns off search links until something is typed, but keeps fixed pages', () => {
    const html = render('/discover/market')
    expect(html).not.toContain('trends.google.com/trends/explore')
    expect(html).toContain('Type something above first')
    expect(html).toContain('href="https://trends.pinterest.com/"')
  })

  it('uses website-only links just when the input is a website', () => {
    const withSite = render('/discover/competitor?q=https%3A%2F%2Fwww.Example.com%2Fpricing')
    expect(withSite).toContain('https://www.similarweb.com/website/example.com/')
    expect(withSite).toContain('https://web.archive.org/web/*/example.com')

    const withName = render('/discover/competitor?q=Acme%20Ltd')
    expect(withName).not.toContain('similarweb.com')
    expect(withName).toContain('Enter a website such as example.com')
    expect(withName).toContain('facebook.com/ads/library/')
    expect(withName).toContain('q=Acme%20Ltd')
  })

  it('keeps the search when switching research type', () => {
    const html = render('/discover/market?q=desks')
    expect(html).toContain('href="/discover/keyword?q=desks"')
  })

  it('shows a helpful page for an unknown research type', () => {
    const html = render('/discover/nonsense')
    expect(html).toContain('Research type not found')
    expect(render('/discover/general')).toContain('Research type not found')
  })
})
