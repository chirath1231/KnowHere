import { useEffect, useState } from 'react'
import { fetchFileBlob } from '@/lib/api'

// Cache blob URLs in memory so the same file isn't fetched twice
const blobCache = new Map<string, string>()

/**
 * Fetches a file from the API using the Authorization header
 * and returns a local blob: URL safe to use in <img>, <video>, <audio>, <iframe>.
 *
 * Usage:
 *   const { blobUrl, loading, error } = useFileBlobUrl(file.id)
 *   <img src={blobUrl ?? ''} />
 */
export function useFileBlobUrl(fileId: string | null | undefined) {
  const [blobUrl, setBlobUrl] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!fileId) {
      setBlobUrl(null)
      return
    }

    // Return cached URL immediately
    if (blobCache.has(fileId)) {
      setBlobUrl(blobCache.get(fileId)!)
      return
    }

    let cancelled = false
    setLoading(true)
    setError(null)
    setBlobUrl(null)

    fetchFileBlob(fileId)
      .then((blob) => {
        if (cancelled) return
        const url = URL.createObjectURL(blob)
        blobCache.set(fileId, url)
        setBlobUrl(url)
      })
      .catch((err) => {
        if (cancelled) return
        setError(err.message || 'Failed to load file')
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [fileId])

  return { blobUrl, loading, error }
}