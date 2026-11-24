import { ImagePlus } from 'lucide-react'
import { useRef } from 'react'
import { BlobImage } from '@/components/BlobImage'
import { Button } from '@/components/ui/button'
import type { NewAttachment } from '@/data/repositories/attachment-types'
import {
  ALLOWED_IMAGE_TYPES,
  MAX_ATTACHMENTS_PER_ITEM,
  formatBytes,
} from '@/lib/images'
import type { Attachment } from '@/types'

export interface PendingImage {
  key: string
  attachment: NewAttachment
}

interface ImagePickerProps {
  existing: Attachment[]
  removedIds: ReadonlySet<string>
  pending: PendingImage[]
  loadingExisting: boolean
  processing: boolean
  messages: string[]
  onFiles: (files: File[]) => void
  onToggleExisting: (id: string) => void
  onRemovePending: (key: string) => void
}

const thumbClass = 'size-14 shrink-0 rounded border bg-muted object-cover'

export function ImagePicker({
  existing,
  removedIds,
  pending,
  loadingExisting,
  processing,
  messages,
  onFiles,
  onToggleExisting,
  onRemovePending,
}: ImagePickerProps) {
  const input = useRef<HTMLInputElement>(null)
  const keptCount = existing.filter((a) => !removedIds.has(a.id)).length
  const total = keptCount + pending.length
  const atLimit = total >= MAX_ATTACHMENTS_PER_ITEM

  return (
    <div>
      <div className="mb-1 flex items-baseline justify-between gap-2">
        <span className="text-sm font-medium">
          Images <span className="font-normal text-muted-foreground">(optional)</span>
        </span>
        <span className="text-xs text-muted-foreground">
          {total} of {MAX_ATTACHMENTS_PER_ITEM}
        </span>
      </div>

      <Button
        type="button"
        variant="outline"
        className="h-10 gap-2"
        disabled={atLimit || processing}
        onClick={() => input.current?.click()}
      >
        <ImagePlus className="size-4" aria-hidden="true" />
        {processing ? 'Adding…' : 'Add images'}
      </Button>
      <input
        ref={input}
        type="file"
        accept={ALLOWED_IMAGE_TYPES.join(',')}
        multiple
        className="hidden"
        aria-label="Choose images"
        onChange={(event) => {
          const files = Array.from(event.target.files ?? [])
          event.target.value = '' // lets you pick the same file again
          onFiles(files)
        }}
      />

      <p className="mt-2 text-xs text-muted-foreground">
        PNG, JPEG, WebP or GIF, up to 10 MB each. Large pictures are shrunk
        automatically. You can also paste a screenshot with Ctrl+V.
      </p>

      {messages.length > 0 && (
        <ul role="alert" className="mt-2 space-y-1 text-sm text-red-700">
          {messages.map((message, index) => (
            <li key={index}>{message}</li>
          ))}
        </ul>
      )}

      {loadingExisting && (
        <p className="mt-2 text-sm text-muted-foreground">Loading saved images…</p>
      )}

      {(existing.length > 0 || pending.length > 0) && (
        <ul className="mt-3 space-y-2">
          {existing.map((attachment) => {
            const removed = removedIds.has(attachment.id)
            return (
              <li
                key={attachment.id}
                className="flex items-center gap-3 rounded-md border p-2"
              >
                <BlobImage
                  blob={attachment.blob}
                  alt=""
                  className={thumbClass + (removed ? ' opacity-40' : '')}
                />
                <div className="min-w-0 flex-1">
                  <p
                    className={
                      'truncate text-sm ' + (removed ? 'text-muted-foreground line-through' : '')
                    }
                  >
                    {attachment.file_name}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {removed ? 'Will be removed when you save' : formatBytes(attachment.size_bytes)}
                  </p>
                </div>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="h-10 md:h-8"
                  aria-label={`${removed ? 'Undo remove' : 'Remove'} ${attachment.file_name}`}
                  onClick={() => onToggleExisting(attachment.id)}
                >
                  {removed ? 'Undo remove' : 'Remove'}
                </Button>
              </li>
            )
          })}

          {pending.map((image) => (
            <li
              key={image.key}
              className="flex items-center gap-3 rounded-md border p-2"
            >
              <BlobImage blob={image.attachment.blob} alt="" className={thumbClass} />
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm">{image.attachment.file_name}</p>
                <p className="text-xs text-muted-foreground">
                  New · {formatBytes(image.attachment.blob.size)}
                </p>
              </div>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="h-10 md:h-8"
                aria-label={`Remove ${image.attachment.file_name}`}
                onClick={() => onRemovePending(image.key)}
              >
                Remove
              </Button>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}