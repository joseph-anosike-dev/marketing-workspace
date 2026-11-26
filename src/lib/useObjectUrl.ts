import { useEffect, useState } from 'react'

/** Gives a temporary address for a stored image and frees it when no longer needed. */
export function useObjectUrl(blob: Blob | null): string | null {
  const [url, setUrl] = useState<string | null>(null)

  useEffect(() => {
    if (!blob) return
    const objectUrl = URL.createObjectURL(blob)
    // The effect exists to keep React in step with a browser resource (the
    // object URL), which is created here and freed in the cleanup below.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setUrl(objectUrl)
    return () => {
      URL.revokeObjectURL(objectUrl)
      setUrl(null)
    }
  }, [blob])

  return blob ? url : null
}
