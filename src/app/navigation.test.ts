import { describe, expect, it } from 'vitest'
import { isMoreActive, moreNavItems, navItems, primaryNavItems } from './navigation'

describe('navigation', () => {
  it('shows Dashboard, Discover and Projects as tabs on a phone', () => {
    expect(primaryNavItems.map((i) => i.label)).toEqual(['Dashboard', 'Discover', 'Projects'])
  })

  it('puts Tools, Prompts, Vault and Settings in the More menu', () => {
    expect(moreNavItems.map((i) => i.label)).toEqual(['Tools', 'Prompts', 'Vault', 'Settings'])
  })

  it('keeps every destination in exactly one place, and in the desktop sidebar', () => {
    expect(primaryNavItems.length + moreNavItems.length).toBe(navItems.length)
    expect(new Set(navItems.map((i) => i.to)).size).toBe(navItems.length)
  })

  it('knows when the current page belongs to More', () => {
    expect(isMoreActive('/vault')).toBe(true)
    expect(isMoreActive('/prompts/market-observation-signals')).toBe(true)
    expect(isMoreActive('/settings')).toBe(true)
    expect(isMoreActive('/')).toBe(false)
    expect(isMoreActive('/projects/abc')).toBe(false)
    expect(isMoreActive('/vaulted')).toBe(false)
  })
})
