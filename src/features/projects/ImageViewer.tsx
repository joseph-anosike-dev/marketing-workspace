import { ChevronLeft, ChevronRight, Download, X } from 'lucide-react'
import { useEffect, useId, useRef, useState, type KeyboardEvent } from 'react'
import { formatBytes } from '@/lib/images'
import { useObjectUrl } from '@/lib/useObjectUrl'
import type { Attachment } from '@/types'
import { stepIndex } from './imageNav'

interface ImageViewerProps {
  images: Attachment[]
  startIndex: number
  onClose: () => void
}

const buttonClass =
  'inline-flex h-11 items-center justify-center gap-2 rounded-md border px-4 text-sm font-medium transition-colors hover:bg-accent focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none'

/**
 * A full-size image viewer built on the browser's own <dialog> element.
 * Mount it only while it should be open.
 */
export function ImageViewer({ images, startIndex, onClose }: ImageViewerProps) {
  const ref = useRef<HTMLDialogElement>(null)
  const titleId = useId()
  const [index, setIndex] = useState(startIndex)
  const count = images.length
  const shown = Math.min(index, count - 1)
  const current = images[shown]
  const url = useObjectUrl(current?.blob ?? null)

  useEffect(() => {
    const dialog = ref.current
    if (dialog && !dialog.open) dialog.showModal()
  }, [])

  function step(delta: 1 | -1) {
    setIndex(stepIndex(shown, count, delta))
  }

  function handleKeyDown(event: KeyboardEvent<HTMLDialogElement>) {
    if (count < 2) return
    if (event.key === 'ArrowLeft') {
      event.preventDefault()
      step(-1)
    } else if (event.key === 'ArrowRight') {
      event.preventDefault()
      step(1)
    }
  }

  if (!current) return null

  const typeLabel = current.mime_type.replace('image/', '').toUpperCase()

  return (
    <dialog
      ref={ref}
      aria-labelledby={titleId}
      onClose={onClose}
      onKeyDown={handleKeyDown}
      // The content fills the whole dialog, so a click on the dialog element
      // itself can only be a click on the dark backdrop.
      onClick={(event) => {
        if (event.target === event.currentTarget) ref.current?.close()
      }}
      className="m-auto h-dvh max-h-none w-dvw max-w-none overflow-hidden rounded-none border-0 bg-card p-0 text-foreground backdrop:bg-black/70 md:h-auto md:max-h-[calc(100dvh-2rem)] md:w-[min(64rem,calc(100%-2rem))] md:rounded-lg md:border md:shadow-lg"
    >
      <div className="flex h-full flex-col md:max-h-[calc(100dvh-2rem)]">
        <div className="flex items-start justify-between gap-3 border-b p-3">
          <div className="min-w-0">
            <h2 id={titleId} className="truncate font-medium">
              {current.file_name}
            </h2>
            <p aria-live="polite" className="text-xs text-muted-foreground">
              {shown + 1} of {count} · {formatBytes(current.size_bytes)} · {typeLabel}
            </p>
          </div>
          <button
            type="button"
            onClick={() => ref.current?.close()}
            aria-label="Close"
            className="-m-1 flex size-11 shrink-0 items-center justify-center rounded-md text-muted-foreground hover:bg-accent hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
          >
            <X className="size-5" aria-hidden="true" />
          </button>
        </div>

        <div className="flex min-h-0 flex-1 items-center justify-center overflow-auto bg-muted/40 p-3">
          {url ? (
            <img
              src={url}
              alt={current.file_name}
              className="max-h-[calc(100dvh-12rem)] max-w-full object-contain md:max-h-[70dvh]"
            />
          ) : (
            <p className="text-sm text-muted-foreground">Image data is missing.</p>
          )}
        </div>

        <div className="flex flex-wrap items-center justify-between gap-2 border-t p-3">
          <div className="flex gap-2">
            {count > 1 && (
              <>
                <button type="button" className={buttonClass} onClick={() => step(-1)}>
                  <ChevronLeft className="size-4" aria-hidden="true" />
                  Previous
                </button>
                <button type="button" className={buttonClass} onClick={() => step(1)}>
                  Next
                  <ChevronRight className="size-4" aria-hidden="true" />
                </button>
              </>
            )}
          </div>
          {url && (
            <a href={url} download={current.file_name} className={buttonClass}>
              <Download className="size-4" aria-hidden="true" />
              Download
            </a>
          )}
        </div>
      </div>
    </dialog>
  )
}