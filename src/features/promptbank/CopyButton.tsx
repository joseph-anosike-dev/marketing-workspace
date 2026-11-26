import { Check, Copy } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { Button } from '@/components/ui/button'
import { copyText } from './clipboard'

interface CopyButtonProps {
  /** Called when the button is pressed, so the copied text is always the latest. */
  getText: () => string
  label: string
  variant?: 'default' | 'outline'
}

export function CopyButton({ getText, label, variant = 'outline' }: CopyButtonProps) {
  const [state, setState] = useState<'idle' | 'copied' | 'failed'>('idle')
  const timer = useRef<number | undefined>(undefined)

  useEffect(() => () => window.clearTimeout(timer.current), [])

  async function copy() {
    const ok = await copyText(getText())
    setState(ok ? 'copied' : 'failed')
    window.clearTimeout(timer.current)
    timer.current = window.setTimeout(() => setState('idle'), 2500)
  }

  return (
    <div className="flex flex-col gap-1">
      <Button type="button" variant={variant} className="h-11 gap-2" onClick={() => void copy()}>
        {state === 'copied' ? (
          <Check className="size-4" aria-hidden="true" />
        ) : (
          <Copy className="size-4" aria-hidden="true" />
        )}
        {state === 'copied' ? 'Copied' : label}
      </Button>
      <p role="status" className="min-h-4 text-xs text-red-700">
        {state === 'failed' ? 'Could not copy. Select the text and copy it by hand.' : ''}
      </p>
    </div>
  )
}
