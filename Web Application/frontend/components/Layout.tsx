'use client'

import { ReactNode } from 'react'
import Sidebar from './Sidebar'
import Header from './Header'
import AISearch from './AISearch'

interface LayoutProps {
  children: ReactNode
  showAISearch?: boolean
  onFileUpload?: (file: File) => void
  viewMode?: 'grid' | 'list'
  onViewModeChange?: (mode: 'grid' | 'list') => void
  searchQuery?: string
  onSearchChange?: (query: string) => void
}

export default function Layout({
  children,
  showAISearch = true,
  onFileUpload,
  viewMode = 'grid',
  onViewModeChange,
  searchQuery = '',
  onSearchChange,
}: LayoutProps) {
  return (
    <div className="flex h-screen bg-transparent">
      <Sidebar />
      <div className="flex-1 flex flex-col overflow-hidden">
        {onFileUpload && onViewModeChange && onSearchChange && (
          <Header
            onFileUpload={onFileUpload}
            viewMode={viewMode}
            onViewModeChange={onViewModeChange}
            searchQuery={searchQuery}
            onSearchChange={onSearchChange}
          />
        )}
        {showAISearch && onSearchChange && (
          <AISearch onSearch={(prompt) => onSearchChange(prompt)} />
        )}
        {children}
      </div>
    </div>
  )
}

