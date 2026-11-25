import { App as CapacitorApp, type BackButtonListenerEvent } from '@capacitor/app'
import { Capacitor, type PluginListenerHandle } from '@capacitor/core'
import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { decideBackAction } from './backButton'

/** Makes Android's back button behave like a person expects. Does nothing in a browser. */
export function useAndroidBackButton() {
  const navigate = useNavigate()

  useEffect(() => {
    if (!Capacitor.isNativePlatform()) return

    let cancelled = false
    let handle: PluginListenerHandle | undefined

    void CapacitorApp.addListener('backButton', ({ canGoBack }: BackButtonListenerEvent) => {
      const dialog = document.querySelector<HTMLDialogElement>('dialog[open]')
      const action = decideBackAction({ dialogOpen: dialog !== null, canGoBack })
      if (action === 'close-dialog') dialog?.close()
      else if (action === 'go-back') navigate(-1)
      else void CapacitorApp.exitApp()
    }).then((added) => {
      if (cancelled) void added.remove()
      else handle = added
    })

    return () => {
      cancelled = true
      void handle?.remove()
    }
  }, [navigate])
}
