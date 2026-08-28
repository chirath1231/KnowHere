'use client'

import { useEffect, useState } from 'react'
import { X, Languages, FileVideo } from 'lucide-react'
import { FileItem } from '@/types/file'

interface SubtitlePromptModalProps {
  open: boolean
  file: FileItem | null
  loading?: boolean
  onClose: () => void
  onSubmit: (language: string, outputFilename: string) => void
}

export default function SubtitlePromptModal({
  open,
  file,
  loading,
  onClose,
  onSubmit,
}: SubtitlePromptModalProps) {
  const [language, setLanguage] = useState('Sinhala')
  const [outputFilename, setOutputFilename] = useState('')

  useEffect(() => {
    if (file) {
      const originalName = file.name || 'video.mp4'
      const dotIndex = originalName.lastIndexOf('.')

      if (dotIndex !== -1) {
        const base = originalName.slice(0, dotIndex)
        const ext = originalName.slice(dotIndex)
        setOutputFilename(`subtitled_${base}${ext}`)
      } else {
        setOutputFilename(`subtitled_${originalName}.mp4`)
      }

      setLanguage('Sinhala')
    }
  }, [file])

  if (!open || !file) return null

  return (
    <div className="fixed inset-0 z-[90] flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-lg rounded-2xl bg-white shadow-2xl">
        <div className="flex items-center justify-between border-b border-gray-200 px-5 py-4">
          <div>
            <div className="flex items-center gap-2 text-lg font-semibold text-gray-900">
              <FileVideo className="h-5 w-5 text-emerald-600" />
              Add subtitles
            </div>
            <p className="mt-1 text-sm text-gray-500">
              Video: {file.name}
            </p>
          </div>

          <button
            onClick={onClose}
            disabled={loading}
            className="rounded-lg p-2 text-gray-500 transition hover:bg-gray-100 hover:text-gray-700 disabled:opacity-50"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="space-y-5 px-5 py-5">
          <div>
            <label className="mb-2 block text-sm font-medium text-gray-700">
              Subtitle language
            </label>
            <div className="relative">
              <Languages className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                value={language}
                onChange={(e) => setLanguage(e.target.value)}
                placeholder="Sinhala"
                className="w-full rounded-xl border border-gray-300 py-3 pl-10 pr-4 text-sm outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100"
              />
            </div>
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium text-gray-700">
              Output file name
            </label>
            <input
              type="text"
              value={outputFilename}
              onChange={(e) => setOutputFilename(e.target.value)}
              placeholder="subtitled_video.mp4"
              className="w-full rounded-xl border border-gray-300 px-4 py-3 text-sm outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100"
            />
          </div>

          <div className="rounded-xl bg-gray-50 p-3 text-sm text-gray-600">
            I’ll create a new subtitled copy of this video and save it to your storage.
          </div>
        </div>

        <div className="flex items-center justify-end gap-3 border-t border-gray-200 px-5 py-4">
          <button
            onClick={onClose}
            disabled={loading}
            className="rounded-xl border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
          >
            Cancel
          </button>

          <button
            onClick={() => onSubmit(language.trim() || 'Sinhala', outputFilename.trim())}
            disabled={loading || !outputFilename.trim()}
            className="rounded-xl bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700 disabled:opacity-50"
          >
            {loading ? 'Creating...' : 'Create subtitles'}
          </button>
        </div>
      </div>
    </div>
  )
}