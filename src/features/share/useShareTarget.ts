import { CapacitorShareTarget } from '@capgo/capacitor-share-target'
import { Capacitor, type PluginListenerHandle } from '@capacitor/core'
import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { interpretShare, isEmptyShare } from './shareContent'

/**
 * Opens the quick-save page whenever another app shares something to
 * Re-Search. Does nothing in a browser.
 */
export function useShareTarget() {
  const navigate = useNavigate()

  useEffect(() => {
    if (!Capacitor.isNativePlatform()) return

    let cancelled = false
    let handle: PluginListenerHandle | undefined

    void CapacitorShareTarget.addListener('shareReceived', (event) => {
      const share = interpretShare(event)
      if (isEmptyShare(share) && share.skipped === 0) return
      navigate('/add', { state: { share } })
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
