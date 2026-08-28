'use client'

import { useState } from 'react'
import Layout from '@/components/Layout'
import { FileItem } from '@/types/file'
import { Trash2, RotateCcw, X } from 'lucide-react'

export default function TrashPage() {
  const [files, setFiles] = useState<FileItem[]>([

  ])

  const [selectedFiles, setSelectedFiles] = useState<string[]>([])
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid')
  const [searchQuery, setSearchQuery] = useState('')

  const handleFileDelete = (fileId: string) => {
    setFiles(files.filter(f => f.id !== fileId))
    setSelectedFiles(selectedFiles.filter(id => id !== fileId))
  }

  const handleRestore = (fileId: string) => {
    setFiles(files.map(f => 
      f.id === fileId ? { ...f, inTrash: false } : f
    ))
  }

  const handleEmptyTrash = () => {
    if (confirm('Are you sure you want to permanently delete all items in trash?')) {
      setFiles([])
      setSelectedFiles([])
    }
  }

  const filteredFiles = searchQuery
    ? files.filter(file => 
        file.name.toLowerCase().includes(searchQuery) ||
        file.type.toLowerCase().includes(searchQuery)
      )
    : files

  return (
    <Layout
      showAISearch={false}
      viewMode={viewMode}
      onViewModeChange={setViewMode}
      searchQuery={searchQuery}
      onSearchChange={setSearchQuery}
    >
      <div className="flex-1 flex flex-col overflow-hidden">
        <div className="px-6 py-4 bg-white border-b border-gray-200">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Trash2 className="w-6 h-6 text-gray-600" />
              <h1 className="text-2xl font-bold text-gray-900">Trash</h1>
              <span className="text-sm text-gray-500">({filteredFiles.length} items)</span>
            </div>
            {filteredFiles.length > 0 && (
              <button
                onClick={handleEmptyTrash}
                className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
              >
                <X className="w-4 h-4" />
                <span>Empty Trash</span>
              </button>
            )}
          </div>
        </div>
        {filteredFiles.length === 0 ? (
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center">
              <Trash2 className="w-16 h-16 text-gray-300 mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-gray-700 mb-2">Trash is empty</h3>
              <p className="text-gray-500">Deleted files will appear here</p>
            </div>
          </div>
        ) : (
          <div className="flex-1 overflow-y-auto p-6">
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
              {filteredFiles.map((file) => (
                <div
                  key={file.id}
                  className={`group relative bg-white rounded-lg border-2 p-4 cursor-pointer transition-all hover:shadow-lg ${
                    selectedFiles.includes(file.id)
                      ? 'border-primary-500 bg-primary-50'
                      : 'border-gray-200 hover:border-primary-300'
                  }`}
                  onClick={() => {
                    setSelectedFiles(prev => 
                      prev.includes(file.id) 
                        ? prev.filter(fid => fid !== file.id)
                        : [...prev, file.id]
                    )
                  }}
                >
                  <div className="flex flex-col items-center text-center">
                    <div className="mb-3">
                      <span className="text-5xl">📄</span>
                    </div>
                    <h3 className="text-sm font-medium text-gray-900 mb-1 line-clamp-2">
                      {file.name}
                    </h3>
                    <p className="text-xs text-gray-500 mb-2">
                      {new Date(file.uploadedAt).toLocaleDateString()}
                    </p>
                  </div>

                  <div className="absolute top-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        handleRestore(file.id)
                      }}
                      className="p-1.5 bg-white rounded-lg shadow-md hover:bg-green-50 text-green-600"
                      title="Restore"
                    >
                      <RotateCcw className="w-4 h-4" />
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        handleFileDelete(file.id)
                      }}
                      className="p-1.5 bg-white rounded-lg shadow-md hover:bg-red-50 text-red-600"
                      title="Delete permanently"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>

                  {selectedFiles.includes(file.id) && (
                    <div className="absolute top-2 left-2">
                      <div className="w-5 h-5 bg-primary-600 rounded flex items-center justify-center">
                        <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                          <path
                            fillRule="evenodd"
                            d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                            clipRule="evenodd"
                          />
                        </svg>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </Layout>
  )
}

