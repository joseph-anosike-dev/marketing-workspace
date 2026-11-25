export type BackAction = 'close-dialog' | 'go-back' | 'exit-app'

/**
 * What Android's back button should do: close an open dialog first, then go
 * back through the pages visited, and leave the app only from the first page.
 */
export function decideBackAction(state: {
  dialogOpen: boolean
  canGoBack: boolean
}): BackAction {
  if (state.dialogOpen) return 'close-dialog'
  return state.canGoBack ? 'go-back' : 'exit-app'
}
