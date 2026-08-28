'use client'

import { useEffect, useState } from 'react'
import Layout from '@/components/Layout'
import { getFiles, updateAIOverview } from '@/lib/api'
import { FileItem, normalizeFileItem } from '@/types/file'
import {
  File,
  FileText,
  Image as ImageIcon,
  Video,
  Music,
  Code,
  FileJson,
  FileSpreadsheet,
  BrainCircuit,
  Sparkles,
  ScanSearch,
} from 'lucide-react'

function getOverviewIcon(type: string) {
  switch ((type || '').toLowerCase()) {
    case 'image':
      return <ImageIcon className="w-6 h-6 text-purple-500" />
    case 'video':
      return <Video className="w-6 h-6 text-red-500" />
    case 'audio':
      return <Music className="w-6 h-6 text-pink-500" />
    case 'pdf':
      return <FileText className="w-6 h-6 text-red-600" />
    case 'xlsx':
    case 'csv':
      return <FileSpreadsheet className="w-6 h-6 text-green-600" />
    case 'json':
      return <FileJson className="w-6 h-6 text-yellow-600" />
    case 'js':
    case 'jsx':
    case 'ts':
    case 'tsx':
    case 'py':
    case 'java':
    case 'c':
    case 'cpp':
    case 'cs':
    case 'php':
    case 'go':
    case 'rb':
    case 'html':
    case 'css':
      return <Code className="w-6 h-6 text-blue-500" />
    default:
      return <File className="w-6 h-6 text-gray-500" />
  }
}

export default function AIOverviewPage() {
  const [files, setFiles] = useState<FileItem[]>([])
  const [editingId, setEditingId] = useState<string | null>(null)
  const [text, setText] = useState('')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    loadFiles()
  }, [])

  const loadFiles = async () => {
    try {
      setLoading(true)
      setError('')
      const data = await getFiles(null)
      setFiles(data.map(normalizeFileItem))
    } catch (err: any) {
      setError(err.message || 'Failed to load files')
    } finally {
      setLoading(false)
    }
  }

  const startEdit = (file: FileItem) => {
    setEditingId(file.id)
    setText(file.aiOverview || '')
  }

  const saveOverview = async (fileId: string) => {
    try {
      setSaving(true)
      setError('')

      await updateAIOverview(fileId, text)

      setFiles((prev) =>
        prev.map((f) =>
          f.id === fileId ? { ...f, aiOverview: text } : f
        )
      )

      setEditingId(null)
      setText('')
    } catch (err: any) {
      setError(err.message || 'Failed to update AI overview')
    } finally {
      setSaving(false)
    }
  }

  const filesWithOverview = files.filter((file) => !!file.aiOverview?.trim()).length

  return (
    <Layout>
      <div className="flex h-full min-h-0 flex-col bg-transparent">
        <div className="border-b border-primary-100 bg-white/80 px-4 py-4 backdrop-blur-xl sm:px-6">
          <div className="mb-3 inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-primary-50 to-violet-50 px-3 py-1 text-xs font-semibold text-primary-700 ring-1 ring-primary-100">
            <BrainCircuit className="h-3.5 w-3.5" />
            AI Metadata Console
          </div>
          <h1 className="text-xl font-bold text-gray-900 sm:text-2xl">
            AI Overview
          </h1>
          <p className="mt-1 text-sm text-gray-500">
            View and edit AI-generated summaries for your files
          </p>
        </div>

        <div className="flex-1 min-h-0 overflow-y-auto px-4 py-4 sm:px-6 sm:py-6">
          <div className="mb-5 grid grid-cols-1 gap-4 md:grid-cols-3">
            <div className="rounded-2xl border border-primary-100 bg-white/90 p-4 shadow-sm">
              <p className="text-xs font-semibold uppercase tracking-wide text-primary-700">Total Files</p>
              <p className="mt-2 text-2xl font-bold text-gray-900">{files.length}</p>
            </div>
            <div className="rounded-2xl border border-primary-100 bg-white/90 p-4 shadow-sm">
              <p className="text-xs font-semibold uppercase tracking-wide text-violet-700">AI Summaries Ready</p>
              <p className="mt-2 text-2xl font-bold text-gray-900">{filesWithOverview}</p>
            </div>
            <div className="rounded-2xl border border-primary-100 bg-white/90 p-4 shadow-sm">
              <p className="text-xs font-semibold uppercase tracking-wide text-blue-700">Coverage</p>
              <p className="mt-2 text-2xl font-bold text-gray-900">
                {files.length === 0 ? '0%' : `${Math.round((filesWithOverview / files.length) * 100)}%`}
              </p>
            </div>
          </div>

          <div className="mb-5 flex flex-wrap items-center gap-2">
            <span className="inline-flex items-center gap-1 rounded-full bg-white px-3 py-1 text-xs font-medium text-primary-700 ring-1 ring-primary-100">
              <ScanSearch className="h-3.5 w-3.5" />
              Semantic retrieval
            </span>
            <span className="inline-flex items-center gap-1 rounded-full bg-white px-3 py-1 text-xs font-medium text-violet-700 ring-1 ring-violet-100">
              <Sparkles className="h-3.5 w-3.5" />
              AI summary tuning
            </span>
          </div>

          {error && (
            <div className="mb-4 rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
              {error}
            </div>
          )}

          {loading ? (
            <p className="text-gray-600">Loading...</p>
          ) : files.length === 0 ? (
            <div className="rounded-xl border border-dashed border-gray-300 bg-white/90 p-8 text-center text-gray-500">
              No files found
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-4 lg:gap-6">
              {files.map((file) => (
                <div
                  key={file.id}
                  className="rounded-xl border border-primary-100 bg-white/90 p-4 shadow-sm"
                >
                  <div className="mb-3 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                    <div className="flex min-w-0 items-center gap-3">
                      <div className="shrink-0">{getOverviewIcon(file.type)}</div>

                      <div className="min-w-0">
                        <h2 className="truncate font-semibold text-gray-900">
                          {file.name}
                        </h2>
                        <p className="text-sm text-gray-500">{file.type}</p>
                      </div>
                    </div>

                    {editingId !== file.id && (
                      <button
                        onClick={() => startEdit(file)}
                        className="self-start rounded-lg px-3 py-1 text-sm font-medium text-blue-600 hover:bg-blue-50 hover:text-blue-700"
                      >
                        Edit
                      </button>
                    )}
                  </div>

                  {editingId === file.id ? (
                    <div>
                      <textarea
                        value={text}
                        onChange={(e) => setText(e.target.value)}
                        className="mb-3 min-h-[120px] w-full rounded-xl border border-gray-300 p-3 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
                        rows={5}
                      />

                      <div className="flex flex-wrap gap-2">
                        <button
                          onClick={() => saveOverview(file.id)}
                          disabled={saving}
                          className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
                        >
                          {saving ? 'Saving...' : 'Save'}
                        </button>

                        <button
                          onClick={() => {
                            setEditingId(null)
                            setText('')
                          }}
                          className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  ) : (
                    <p className="whitespace-pre-wrap break-words text-sm leading-6 text-gray-700">
                      {file.aiOverview || 'No AI overview available'}
                    </p>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </Layout>
  )
}