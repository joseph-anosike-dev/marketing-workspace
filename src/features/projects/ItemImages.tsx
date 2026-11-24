import { useEffect, useState } from 'react'
import { BlobImage } from '@/components/BlobImage'
import { attachmentsRepo } from '@/data/repositories'
import type { Attachment } from '@/types'
import { ImageViewer } from './ImageViewer'

const MAX_THUMBS = 4

interface ItemImagesProps {
  itemId: string
  /**
   * Changing a finding's images updates its "updated" time, so passing that
   * time here makes the thumbnails reload after an edit.
   */
  updatedAt: string
  title: string
}

const tileClass = 'size-16 shrink-0 rounded border md:size-20'

export function ItemImages({ itemId, updatedAt, title }: ItemImagesProps) {
  const [images, setImages] = useState<Attachment[]>([])
  const [viewerIndex, setViewerIndex] = useState<number | null>(null)

  useEffect(() => {
    let cancelled = false
    attachmentsRepo
      .listForItem(itemId)
      .then((rows) => {
        if (!cancelled) setImages(rows)
      })
      .catch(() => {
        if (!cancelled) setImages([])
      })
    return () => {
      cancelled = true
    }
  }, [itemId, updatedAt])

  if (images.length === 0) return null

  const shown = images.slice(0, MAX_THUMBS)
  const extra = images.length - shown.length

  return (
    <>
      <ul className="flex flex-wrap gap-2" aria-label={`Images for ${title}`}>
        {shown.map((image, index) => (
          <li key={image.id}>
            <button
              type="button"
              onClick={() => setViewerIndex(index)}
              aria-label={`View ${image.file_name}`}
              className="block rounded focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
            >
              <BlobImage
                blob={image.blob}
                alt=""
                className={`${tileClass} bg-muted object-cover`}
              />
            </button>
          </li>
        ))}
        {extra > 0 && (
          <li>
            <button
              type="button"
              onClick={() => setViewerIndex(MAX_THUMBS)}
              aria-label={`View ${extra} more ${extra === 1 ? 'image' : 'images'}`}
              className={`${tileClass} flex items-center justify-center bg-muted text-sm font-medium hover:bg-accent focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none`}
            >
              +{extra}
            </button>
          </li>
        )}
      </ul>

      {viewerIndex !== null && (
        <ImageViewer
          images={images}
          startIndex={viewerIndex}
          onClose={() => setViewerIndex(null)}
        />
      )}
    </>
  )
}