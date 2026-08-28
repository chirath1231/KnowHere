'use client'

import { X, Download } from 'lucide-react'

interface FilePreviewModalProps {
  file: any
  previewUrl: string | null
  textContent?: string
  loading?: boolean
  onClose: () => void
  onDownload: () => void
}

export default function FilePreviewModal({
  file,
  previewUrl,
  textContent,
  loading,
  onClose,
  onDownload,
}: FilePreviewModalProps) {
  if (!file) return null

  const type = (file.type || '').toLowerCase()

  const imageTypes = ['image', 'jpg', 'jpeg', 'png', 'gif', 'webp', 'bmp', 'svg']
  const videoTypes = ['video', 'mp4', 'webm', 'mov', 'avi', 'mkv', 'm4v']

  const isImage = imageTypes.includes(type)
  const isVideo = videoTypes.includes(type)
  const isPdf = type === 'pdf'

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
      <div className="flex h-[90vh] w-[90vw] flex-col rounded-xl bg-white shadow-xl">
        <div className="flex items-center justify-between border-b p-4">
          <h2 className="truncate font-semibold">{file.name}</h2>

          <div className="flex gap-2">
            <button
              onClick={onDownload}
              className="rounded-lg p-2 hover:bg-gray-100"
              title="Download"
            >
              <Download className="h-5 w-5" />
            </button>

            <button
              onClick={onClose}
              className="rounded-lg p-2 hover:bg-gray-100"
              title="Close"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        <div className="flex flex-1 items-center justify-center overflow-auto bg-gray-50">
          {loading && <p className="text-gray-600">Loading preview...</p>}

          {!loading && isImage && previewUrl && (
            <img
              src={previewUrl}
              alt={file.name}
              className="max-h-full max-w-full object-contain"
            />
          )}

          {!loading && isPdf && previewUrl && (
            <iframe
              src={previewUrl}
              className="h-full w-full"
              title={file.name}
            />
          )}

          {!loading && isVideo && previewUrl && (
            <video
              controls
              src={previewUrl}
              className="max-h-full max-w-full"
            />
          )}

          {!loading && textContent !== undefined && textContent !== null && !isImage && !isPdf && !isVideo && (
            <pre className="h-full w-full overflow-auto whitespace-pre-wrap p-4 text-sm text-gray-800">
              {textContent}
            </pre>
          )}

          {!loading && previewUrl && !isImage && !isPdf && !isVideo && (textContent === undefined || textContent === null) && (
            <p className="text-gray-500">
              Preview is available for download, but inline rendering is not supported for this file type.
            </p>
          )}

          {!loading && !previewUrl && (textContent === undefined || textContent === null || textContent === '') && (
            <p className="text-gray-500">No preview available</p>
          )}
        </div>
      </div>
    </div>
  )
}