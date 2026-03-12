'use client'

import { useEffect, useMemo, useState } from 'react'
import Layout from '@/components/Layout'
import FileGrid from '@/components/FileGrid'
import { FileItem, normalizeFileItem } from '@/types/file'
import { FolderPlus, Folder } from 'lucide-react'
import {
  getFolders,
  createFolder,
  getFiles,
  uploadFile,
  deleteFile,
} from '@/lib/api'

export default function FoldersPage() {
  const [folders, setFolders] = useState<FileItem[]>([])
  const [files, setFiles] = useState<FileItem[]>([])
  const [selectedFiles, setSelectedFiles] = useState<string[]>([])
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid')
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedFolder, setSelectedFolder] = useState<string | null>(null)
  const [newFolderName, setNewFolderName] = useState('')
  const [showNewFolder, setShowNewFolder] = useState(false)
  const [loading, setLoading] = useState(true)
  const [uploading, setUploading] = useState(false)
  const [creatingFolder, setCreatingFolder] = useState(false)
  const [error, setError] = useState('')

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
      setError(err.message || 'Failed to load data')
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
    } catch (err: any) {
      setError(err.message || 'Failed to load root files')
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
    } catch (err: any) {
      setError(err.message || 'Failed to load files')
    } finally {
      setLoading(false)
    }
  }

  const handleFileUpload = async (file: File) => {
    try {
      setUploading(true)
      setError('')

      const uploaded = await uploadFile(file, selectedFolder)
      const normalized = normalizeFileItem(uploaded)

      setFiles((prev) => [normalized, ...prev])
    } catch (err: any) {
      setError(err.message || 'File upload failed')
    } finally {
      setUploading(false)
    }
  }

  const handleFileDelete = async (fileId: string) => {
    try {
      setError('')
      await deleteFile(fileId)
      setFiles((prev) => prev.filter((f) => f.id !== fileId))
      setSelectedFiles((prev) => prev.filter((id) => id !== fileId))
    } catch (err: any) {
      setError(err.message || 'Delete failed')
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
      setError(err.message || 'Failed to create folder')
    } finally {
      setCreatingFolder(false)
    }
  }

  const handleAISearch = (prompt: string) => {
    setSearchQuery(prompt.toLowerCase())
  }

  const displayedItems = useMemo(() => {
    return selectedFolder ? files : [...folders, ...files]
  }, [selectedFolder, files, folders])

  const filteredItems = useMemo(() => {
    if (!searchQuery.trim()) return displayedItems

    const q = searchQuery.toLowerCase()

    return displayedItems.filter((item) => {
      const name = item.name?.toLowerCase() || ''
      const type = item.type?.toLowerCase() || ''
      return name.includes(q) || type.includes(q)
    })
  }, [displayedItems, searchQuery])

  const selectedFolderName = folders.find((f) => f.id === selectedFolder)?.name

  return (
    <Layout
      showAISearch={true}
      onFileUpload={handleFileUpload}
      viewMode={viewMode}
      onViewModeChange={setViewMode}
      searchQuery={searchQuery}
      onSearchChange={(query) => {
        setSearchQuery(query)
        handleAISearch(query)
      }}
    >
      <div className="flex-1 flex flex-col overflow-hidden bg-gray-50">
        <div className="px-6 py-4 bg-white border-b border-gray-200">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-3 min-w-0">
              <Folder className="w-6 h-6 text-primary-600 shrink-0" />
              <h1 className="text-2xl font-bold text-gray-900 truncate">
                {selectedFolder ? `Folder: ${selectedFolderName || ''}` : 'Folders'}
              </h1>

              {selectedFolder && (
                <button
                  onClick={() => {
                    setSelectedFolder(null)
                    setSelectedFiles([])
                    setError('')
                  }}
                  className="text-sm text-primary-600 hover:text-primary-700 whitespace-nowrap"
                >
                  ← Back to Folders
                </button>
              )}
            </div>

            {!selectedFolder && (
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
              selectedFiles={selectedFiles}
              onSelectFile={(id) => {
                const item = filteredItems.find((f) => f.id === id)

                if (item?.type === 'folder') {
                  setSelectedFolder(id)
                  setSelectedFiles([])
                } else {
                  setSelectedFiles((prev) =>
                    prev.includes(id)
                      ? prev.filter((fid) => fid !== id)
                      : [...prev, id]
                  )
                }
              }}
              onDeleteFile={handleFileDelete}
            />
          )}
        </div>
      </div>
    </Layout>
  )
}