'use client'

import { useEffect, useMemo, useState } from 'react'
import Layout from '@/components/Layout'
import FileGrid from '@/components/FileGrid'
import AISearch from '@/components/AISearch'
import FilePreviewModal from '@/components/FilePreviewModal'
import { FileItem, normalizeFileItem } from '@/types/file'
import { FolderPlus, Folder } from 'lucide-react'
import {
  getFolders,
  createFolder,
  getFiles,
  uploadFile,
  deleteFile,
  searchFilesByAI,
  fetchPreviewBlob,
  triggerFileDownload,
} from '@/lib/api'

export default function FoldersPage() {
  const [folders, setFolders] = useState<FileItem[]>([])
  const [files, setFiles] = useState<FileItem[]>([])
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid')
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedFolder, setSelectedFolder] = useState<string | null>(null)
  const [newFolderName, setNewFolderName] = useState('')
  const [showNewFolder, setShowNewFolder] = useState(false)
  const [loading, setLoading] = useState(true)
  const [uploading, setUploading] = useState(false)
  const [creatingFolder, setCreatingFolder] = useState(false)
  const [error, setError] = useState('')
  const [aiResults, setAiResults] = useState<FileItem[] | null>(null)

  const [previewFile, setPreviewFile] = useState<FileItem | null>(null)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [previewText, setPreviewText] = useState('')
  const [previewLoading, setPreviewLoading] = useState(false)

  useEffect(() => {
    loadInitialData()
  }, [])

  useEffect(() => {
    if (selectedFolder) {
      loadFiles(selectedFolder)
    } else {
      loadRootFiles()
    }
  }, [selectedFolder])

  useEffect(() => {
    return () => {
      if (previewUrl) {
        URL.revokeObjectURL(previewUrl)
      }
    }
  }, [previewUrl])

  const loadInitialData = async () => {
    try {
      setLoading(true)
      setError('')

      const [foldersData, rootFilesData] = await Promise.all([
        getFolders(),
        getFiles(null),
      ])

      setFolders(foldersData.map(normalizeFileItem))
      setFiles(rootFilesData.map(normalizeFileItem))
    } catch (err: any) {
      setError(err?.message || 'Failed to load data')
    } finally {
      setLoading(false)
    }
  }

  const loadRootFiles = async () => {
    try {
      setLoading(true)
      setError('')
      const data = await getFiles(null)
      setFiles(data.map(normalizeFileItem))
      setAiResults(null)
    } catch (err: any) {
      setError(err?.message || 'Failed to load root files')
    } finally {
      setLoading(false)
    }
  }

  const loadFiles = async (folderId?: string | null) => {
    try {
      setLoading(true)
      setError('')
      const data = await getFiles(folderId)
      setFiles(data.map(normalizeFileItem))
      setAiResults(null)
    } catch (err: any) {
      setError(err?.message || 'Failed to load files')
    } finally {
      setLoading(false)
    }
  }

  const handleFileUpload = async (file: File) => {
    try {
      setUploading(true)
      setError('')
      const uploaded = await uploadFile(file, selectedFolder)
      setFiles((prev) => [normalizeFileItem(uploaded), ...prev])
    } catch (err: any) {
      setError(err?.message || 'File upload failed')
    } finally {
      setUploading(false)
    }
  }

  const handleFileDelete = async (fileId: string) => {
    try {
      setError('')
      await deleteFile(fileId)

      setFiles((prev) => prev.filter((f) => f.id !== fileId))

      if (aiResults) {
        setAiResults((prev) => (prev ? prev.filter((f) => f.id !== fileId) : null))
      }

      if (previewFile?.id === fileId) {
        closePreview()
      }
    } catch (err: any) {
      setError(err?.message || 'Delete failed')
    }
  }

  const handleCreateFolder = async () => {
    if (!newFolderName.trim()) return

    try {
      setCreatingFolder(true)
      setError('')
      const created = await createFolder(newFolderName.trim())
      setFolders((prev) => [normalizeFileItem(created), ...prev])
      setNewFolderName('')
      setShowNewFolder(false)
    } catch (err: any) {
      setError(err?.message || 'Failed to create folder')
    } finally {
      setCreatingFolder(false)
    }
  }

  const handleAISearch = async (prompt: string) => {
    try {
      setError('')
      const result = await searchFilesByAI(prompt)
      setAiResults((result.matches || []).map(normalizeFileItem))
      setSearchQuery(prompt.toLowerCase())
      setSelectedFolder(null)
    } catch (err: any) {
      setError(err?.message || 'AI search failed')
    }
  }

  const clearAISearch = () => {
    setAiResults(null)
    setSearchQuery('')
  }

  const openPreview = async (file: FileItem) => {
    try {
      setPreviewLoading(true)
      setError('')
      setPreviewFile(file)
      setPreviewText('')

      if (previewUrl) {
        URL.revokeObjectURL(previewUrl)
        setPreviewUrl(null)
      }

      const blob = await fetchPreviewBlob(file.id)

      const url = URL.createObjectURL(blob)
      setPreviewUrl(url)

      const type = (file.type || '').toLowerCase()
      const blobType = (blob.type || '').toLowerCase()
      const extension = (file.name?.split('.').pop() || '').toLowerCase()
      const textTypes = new Set([
        'txt',
        'md',
        'js',
        'jsx',
        'ts',
        'tsx',
        'py',
        'java',
        'c',
        'cpp',
        'cs',
        'php',
        'go',
        'rb',
        'html',
        'css',
        'json',
        'xml',
        'yml',
        'yaml',
        'sql',
        'csv',
        'log',
      ])

      const shouldLoadText =
        textTypes.has(type) ||
        textTypes.has(extension) ||
        blobType.startsWith('text/') ||
        blobType.includes('json') ||
        blobType.includes('xml') ||
        blobType.includes('javascript')

      if (shouldLoadText) {
        const text = await blob.text()
        setPreviewText(text)
      }
    } catch (err: any) {
      setError(err?.message || 'Failed to preview file')
      setPreviewFile(null)
      if (previewUrl) {
        URL.revokeObjectURL(previewUrl)
      }
      setPreviewUrl(null)
      setPreviewText('')
    } finally {
      setPreviewLoading(false)
    }
  }

  const closePreview = () => {
    setPreviewFile(null)
    setPreviewText('')
    setPreviewLoading(false)

    if (previewUrl) {
      URL.revokeObjectURL(previewUrl)
      setPreviewUrl(null)
    }
  }

  const handleDownload = async (file: FileItem) => {
    try {
      setError('')
      await triggerFileDownload(file.id, file.name)
    } catch (err: any) {
      setError(err?.message || 'Download failed')
    }
  }

  const displayedItems = useMemo(() => {
    if (aiResults) return aiResults
    return selectedFolder ? files : [...folders, ...files]
  }, [aiResults, selectedFolder, files, folders])

  const filteredItems = useMemo(() => {
    if (aiResults) return displayedItems
    if (!searchQuery.trim()) return displayedItems

    const q = searchQuery.toLowerCase()

    return displayedItems.filter((item) => {
      const name = item.name?.toLowerCase() || ''
      const type = item.type?.toLowerCase() || ''
      return name.includes(q) || type.includes(q)
    })
  }, [displayedItems, searchQuery, aiResults])

  const selectedFolderName = folders.find((f) => f.id === selectedFolder)?.name

  return (
    <Layout
      showAISearch={false}
      onFileUpload={handleFileUpload}
      viewMode={viewMode}
      onViewModeChange={setViewMode}
      searchQuery={searchQuery}
      onSearchChange={setSearchQuery}
    >
      <div className="flex h-full min-h-0 flex-col bg-gray-50">
        <AISearch onSearch={handleAISearch} />

        <div className="px-6 py-4 bg-white border-b border-gray-200">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-3 min-w-0">
              <Folder className="w-6 h-6 text-primary-600 shrink-0" />

              <h1 className="text-2xl font-bold text-gray-900 truncate">
                {aiResults
                  ? 'AI Search Results'
                  : selectedFolder
                  ? `Folder: ${selectedFolderName || ''}`
                  : 'Folders'}
              </h1>

              {selectedFolder && !aiResults && (
                <button
                  onClick={() => {
                    setSelectedFolder(null)
                    setError('')
                  }}
                  className="text-sm text-primary-600 hover:text-primary-700 whitespace-nowrap"
                >
                  ← Back to Folders
                </button>
              )}

              {aiResults && (
                <button
                  onClick={clearAISearch}
                  className="text-sm text-primary-600 hover:text-primary-700 whitespace-nowrap"
                >
                  Clear AI Search
                </button>
              )}
            </div>

            {!selectedFolder && !aiResults && (
              <div className="flex items-center gap-2">
                {showNewFolder ? (
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      value={newFolderName}
                      onChange={(e) => setNewFolderName(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && handleCreateFolder()}
                      placeholder="Folder name"
                      className="px-3 py-1.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                      autoFocus
                    />
                    <button
                      onClick={handleCreateFolder}
                      disabled={creatingFolder}
                      className="px-4 py-1.5 bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-50"
                    >
                      {creatingFolder ? 'Creating...' : 'Create'}
                    </button>
                    <button
                      onClick={() => {
                        setShowNewFolder(false)
                        setNewFolderName('')
                      }}
                      className="px-4 py-1.5 border border-gray-300 rounded-lg hover:bg-gray-50"
                    >
                      Cancel
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={() => setShowNewFolder(true)}
                    className="flex items-center gap-2 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors"
                  >
                    <FolderPlus className="w-4 h-4" />
                    <span>New Folder</span>
                  </button>
                )}
              </div>
            )}
          </div>

          {error && (
            <div className="mt-3 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
              {error}
            </div>
          )}

          {uploading && (
            <div className="mt-3 rounded-lg border border-blue-200 bg-blue-50 px-3 py-2 text-sm text-blue-700">
              Uploading file...
            </div>
          )}
        </div>

        <div className="flex-1 overflow-auto p-6">
          {loading ? (
            <div className="text-gray-600">Loading...</div>
          ) : (
            <FileGrid
              files={filteredItems}
              viewMode={viewMode}
              onOpenFolder={(id) => {
                setSelectedFolder(id)
                setError('')
              }}
              onOpenFile={openPreview}
              onDeleteFile={handleFileDelete}
              onDownloadFile={handleDownload}
            />
          )}
        </div>

        <FilePreviewModal
          file={previewFile}
          previewUrl={previewUrl}
          textContent={previewText}
          loading={previewLoading}
          onClose={closePreview}
          onDownload={() => {
            if (previewFile) {
              handleDownload(previewFile)
            }
          }}
        />
      </div>
    </Layout>
  )
}