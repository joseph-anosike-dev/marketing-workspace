import { useEffect, useState } from 'react'

interface BlobImageProps {
  blob: Blob | null
  alt: string
  className?: string
}

/** Shows an image stored in the database and frees its memory when it goes away. */
export function BlobImage({ blob, alt, className }: BlobImageProps) {
  const [url, setUrl] = useState<string | null>(null)

  useEffect(() => {
    if (!blob) return
    const objectUrl = URL.createObjectURL(blob)
    setUrl(objectUrl)
    return () => {
      URL.revokeObjectURL(objectUrl)
      setUrl(null)
    }
  }, [blob])

  if (!url) return <div className={className} aria-hidden="true" />
  return <img src={url} alt={alt} className={className} />
}