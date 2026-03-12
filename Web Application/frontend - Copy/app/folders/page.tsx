'use client'

import { useState } from 'react'
import Layout from '@/components/Layout'
import FileGrid from '@/components/FileGrid'
import { FileItem } from '@/types/file'
import { FolderPlus, Folder } from 'lucide-react'

export default function FoldersPage() {
  const [folders, setFolders] = useState<FileItem[]>([
    {
      id: 'f1',
      name: 'Projects',
      type: 'folder',
      size: 0,
      uploadedAt: new Date('2024-01-10'),
      thumbnail: null,
    },
    {
      id: 'f2',
      name: 'Documents',
      type: 'folder',
      size: 0,
      uploadedAt: new Date('2024-01-08'),
      thumbnail: null,
    },
    {
      id: 'f3',
      name: 'Images',
      type: 'folder',
      size: 0,
      uploadedAt: new Date('2024-01-05'),
      thumbnail: null,
    },
    {
      id: 'f4',
      name: 'Videos',
      type: 'folder',
      size: 0,
      uploadedAt: new Date('2024-01-03'),
      thumbnail: null,
    },
  ])

  const [files, setFiles] = useState<FileItem[]>([
    {
      id: '1',
      name: 'Project Proposal.pdf',
      type: 'pdf',
      size: 2048000,
      uploadedAt: new Date('2024-01-15'),
      thumbnail: null,
      folderId: 'f1',
    },
    {
      id: '2',
      name: 'Meeting Notes.docx',
      type: 'docx',
      size: 1536000,
      uploadedAt: new Date('2024-01-14'),
      thumbnail: null,
      folderId: 'f2',
    },
  ])

  const [selectedFiles, setSelectedFiles] = useState<string[]>([])
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid')
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedFolder, setSelectedFolder] = useState<string | null>(null)
  const [newFolderName, setNewFolderName] = useState('')
  const [showNewFolder, setShowNewFolder] = useState(false)

  const handleFileUpload = (file: File) => {
    const newFile: FileItem = {
      id: Date.now().toString(),
      name: file.name,
      type: file.type.startsWith('image/') ? 'image' : 
            file.type.startsWith('video/') ? 'video' :
            file.name.split('.').pop() || 'file',
      size: file.size,
      uploadedAt: new Date(),
      thumbnail: null,
      folderId: selectedFolder || undefined,
    }
    setFiles([newFile, ...files])
  }

  const handleFileDelete = (fileId: string) => {
    setFiles(files.filter(f => f.id !== fileId))
    setSelectedFiles(selectedFiles.filter(id => id !== fileId))
  }

  const handleCreateFolder = () => {
    if (newFolderName.trim()) {
      const newFolder: FileItem = {
        id: `f${Date.now()}`,
        name: newFolderName,
        type: 'folder',
        size: 0,
        uploadedAt: new Date(),
        thumbnail: null,
      }
      setFolders([newFolder, ...folders])
      setNewFolderName('')
      setShowNewFolder(false)
    }
  }

  const handleAISearch = (prompt: string) => {
    setSearchQuery(prompt.toLowerCase())
  }

  const displayedItems = selectedFolder
    ? files.filter(f => f.folderId === selectedFolder)
    : folders

  const filteredItems = searchQuery
    ? displayedItems.filter(item => 
        item.name.toLowerCase().includes(searchQuery) ||
        item.type.toLowerCase().includes(searchQuery)
      )
    : displayedItems

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
      <div className="flex-1 flex flex-col overflow-hidden">
        <div className="px-6 py-4 bg-white border-b border-gray-200">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Folder className="w-6 h-6 text-primary-600" />
              <h1 className="text-2xl font-bold text-gray-900">
                {selectedFolder ? `Folder: ${folders.find(f => f.id === selectedFolder)?.name}` : 'Folders'}
              </h1>
              {selectedFolder && (
                <button
                  onClick={() => setSelectedFolder(null)}
                  className="text-sm text-primary-600 hover:text-primary-700"
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
                      onKeyPress={(e) => e.key === 'Enter' && handleCreateFolder()}
                      placeholder="Folder name"
                      className="px-3 py-1.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                      autoFocus
                    />
                    <button
                      onClick={handleCreateFolder}
                      className="px-4 py-1.5 bg-primary-600 text-white rounded-lg hover:bg-primary-700"
                    >
                      Create
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
        </div>
        <FileGrid
          files={filteredItems}
          viewMode={viewMode}
          selectedFiles={selectedFiles}
          onSelectFile={(id) => {
            const item = filteredItems.find(f => f.id === id)
            if (item?.type === 'folder') {
              setSelectedFolder(id)
              setSelectedFiles([])
            } else {
              setSelectedFiles(prev => 
                prev.includes(id) 
                  ? prev.filter(fid => fid !== id)
                  : [...prev, id]
              )
            }
          }}
          onDeleteFile={handleFileDelete}
        />
      </div>
    </Layout>
  )
}

