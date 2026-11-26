import { useObjectUrl } from '@/lib/useObjectUrl'

interface BlobImageProps {
  blob: Blob | null
  alt: string
  className?: string
}

/** Shows an image stored in the database and frees its memory when it goes away. */
export function BlobImage({ blob, alt, className }: BlobImageProps) {
  const url = useObjectUrl(blob)

  if (!url) return <div className={className} aria-hidden="true" />
  return <img src={url} alt={alt} className={className} />
}
