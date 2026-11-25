import { describe, expect, it } from 'vitest'
import { decideBackAction } from './backButton'

describe('decideBackAction', () => {
  it('closes an open dialog before anything else', () => {
    expect(decideBackAction({ dialogOpen: true, canGoBack: true })).toBe('close-dialog')
    expect(decideBackAction({ dialogOpen: true, canGoBack: false })).toBe('close-dialog')
  })

  it('goes back when there is somewhere to go back to', () => {
    expect(decideBackAction({ dialogOpen: false, canGoBack: true })).toBe('go-back')
  })

  it('leaves the app only from the first page', () => {
    expect(decideBackAction({ dialogOpen: false, canGoBack: false })).toBe('exit-app')
  })
})
