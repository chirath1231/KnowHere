'use client'

import { useState } from 'react'
import Layout from '@/components/Layout'
import FileGrid from '@/components/FileGrid'
import { FileItem } from '@/types/file'

export default function Home() {
  const [files, setFiles] = useState<FileItem[]>([
    {
      id: '1',
      name: 'Project Proposal.pdf',
      type: 'pdf',
      size: 2048000,
      uploadedAt: new Date('2024-01-15'),
      thumbnail: null,
    },
    {
      id: '2',
      name: 'Meeting Notes.docx',
      type: 'docx',
      size: 1536000,
      uploadedAt: new Date('2024-01-14'),
      thumbnail: null,
    },
    {
      id: '3',
      name: 'Presentation.pptx',
      type: 'pptx',
      size: 5120000,
      uploadedAt: new Date('2024-01-13'),
      thumbnail: null,
    },
    {
      id: '4',
      name: 'Budget Spreadsheet.xlsx',
      type: 'xlsx',
      size: 3072000,
      uploadedAt: new Date('2024-01-12'),
      thumbnail: null,
    },
    {
      id: '5',
      name: 'Design Mockup.png',
      type: 'image',
      size: 4096000,
      uploadedAt: new Date('2024-01-11'),
      thumbnail: null,
    },
    {
      id: '6',
      name: 'Video Demo.mp4',
      type: 'video',
      size: 52428800,
      uploadedAt: new Date('2024-01-10'),
      thumbnail: null,
    },
  ])

  const [selectedFiles, setSelectedFiles] = useState<string[]>([])
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid')
  const [searchQuery, setSearchQuery] = useState('')

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
    }
    setFiles([newFile, ...files])
  }

  const handleFileDelete = (fileId: string) => {
    setFiles(files.filter(f => f.id !== fileId))
    setSelectedFiles(selectedFiles.filter(id => id !== fileId))
  }

  const handleAISearch = (prompt: string) => {
    // This would normally call your AI backend
    // For now, we'll do a simple keyword search
    setSearchQuery(prompt.toLowerCase())
  }

  const filteredFiles = searchQuery
    ? files.filter(file => 
        file.name.toLowerCase().includes(searchQuery) ||
        file.type.toLowerCase().includes(searchQuery)
      )
    : files

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
          <h1 className="text-2xl font-bold text-gray-900">My Drive</h1>
        </div>
        <FileGrid
          files={filteredFiles}
          viewMode={viewMode}
          selectedFiles={selectedFiles}
          onSelectFile={(id) => {
            setSelectedFiles(prev => 
              prev.includes(id) 
                ? prev.filter(fid => fid !== id)
                : [...prev, id]
            )
          }}
          onDeleteFile={handleFileDelete}
        />
      </div>
    </Layout>
  )
}

