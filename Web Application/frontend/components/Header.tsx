'use client'

import { useState, useRef } from 'react'
import { Search, Upload, Grid, List, X } from 'lucide-react'
import { FileItem } from '@/types/file'

interface HeaderProps {
  onFileUpload: (file: File) => void
  viewMode: 'grid' | 'list'
  onViewModeChange: (mode: 'grid' | 'list') => void
  searchQuery: string
  onSearchChange: (query: string) => void
}

export default function Header({
  onFileUpload,
  viewMode,
  onViewModeChange,
  searchQuery,
  onSearchChange,
}: HeaderProps) {
  const [isUploading, setIsUploading] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      setIsUploading(true)
      // Simulate upload
      setTimeout(() => {
        onFileUpload(file)
        setIsUploading(false)
        if (fileInputRef.current) {
          fileInputRef.current.value = ''
        }
      }, 500)
    }
  }

  return (
    <header className="bg-white/80 backdrop-blur-xl border-b border-primary-100 px-6 py-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center flex-1 max-w-2xl">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
            <input
              type="text"
              placeholder="Search files..."
              value={searchQuery}
              onChange={(e) => onSearchChange(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 border border-primary-200 rounded-xl bg-white/90 shadow-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
            />
            {searchQuery && (
              <button
                onClick={() => onSearchChange('')}
                className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>

        <div className="flex items-center gap-4 ml-6">
          <div className="flex items-center gap-2 bg-primary-50 rounded-xl p-1 ring-1 ring-primary-100">
            <button
              onClick={() => onViewModeChange('grid')}
              className={`p-2 rounded ${
                viewMode === 'grid'
                  ? 'bg-white text-primary-700 shadow-sm'
                  : 'text-gray-600 hover:text-primary-700'
              }`}
            >
              <Grid className="w-4 h-4" />
            </button>
            <button
              onClick={() => onViewModeChange('list')}
              className={`p-2 rounded ${
                viewMode === 'list'
                  ? 'bg-white text-primary-700 shadow-sm'
                  : 'text-gray-600 hover:text-primary-700'
              }`}
            >
              <List className="w-4 h-4" />
            </button>
          </div>

          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileSelect}
            className="hidden"
            id="file-upload"
          />
          <label
            htmlFor="file-upload"
            className={`flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-primary-600 to-violet-600 text-white rounded-xl cursor-pointer hover:from-primary-700 hover:to-violet-700 transition-all shadow-md shadow-primary-500/25 ${
              isUploading ? 'opacity-50 cursor-not-allowed' : ''
            }`}
          >
            <Upload className="w-4 h-4" />
            <span>{isUploading ? 'Uploading...' : 'Upload'}</span>
          </label>
        </div>
      </div>
    </header>
  )
}

