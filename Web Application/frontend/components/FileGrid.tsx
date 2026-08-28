'use client'

import { FileItem, formatFileSize, getFileIcon } from '@/types/file'
import { Download, Trash2, Eye, Folder, Bot, Subtitles } from 'lucide-react'
import { useState } from 'react'

interface FileGridProps {
  files: FileItem[]
  viewMode: 'grid' | 'list'
  onOpenFolder: (id: string) => void
  onOpenFile: (file: FileItem) => void
  onDeleteFile: (id: string) => void
  onDownloadFile: (file: FileItem) => void
  onAnalyseFile?: (file: FileItem) => void
  onAddSubtitle?: (file: FileItem) => void
}

export default function FileGrid({
  files,
  viewMode,
  onOpenFolder,
  onOpenFile,
  onDeleteFile,
  onDownloadFile,
  onAnalyseFile,
  onAddSubtitle,
}: FileGridProps) {
  const [hoveredFile, setHoveredFile] = useState<string | null>(null)

  const isVideoFile = (file: FileItem) => {
    const type = (file.type || '').toLowerCase()
    return ['video', 'mp4', 'mov', 'avi', 'mkv', 'webm', 'm4v'].includes(type)
  }

  if (files.length === 0) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="text-center rounded-2xl border border-primary-100 bg-white/80 px-10 py-12 shadow-sm">
          <div className="text-6xl mb-4">📁</div>
          <h3 className="text-xl font-semibold text-gray-800 mb-2">No files found</h3>
          <p className="text-gray-500">Upload files or adjust your search</p>
        </div>
      </div>
    )
  }

  const handleOpen = (file: FileItem) => {
    if (file.type === 'folder') {
      onOpenFolder(file.id)
    } else {
      onOpenFile(file)
    }
  }

  if (viewMode === 'list') {
    return (
      <div className="flex-1 overflow-y-auto p-6">
        <div className="bg-white/90 backdrop-blur rounded-xl border border-primary-100 overflow-hidden shadow-sm">
          <table className="w-full">
            <thead className="bg-gradient-to-r from-primary-50 to-violet-50 border-b border-primary-100">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Name</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Type</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Size</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Uploaded</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Actions</th>
              </tr>
            </thead>

            <tbody className="divide-y divide-primary-50">
              {files.map((file) => (
                <tr
                  key={file.id}
                  className="hover:bg-primary-50/40 cursor-pointer transition-colors"
                  onClick={() => handleOpen(file)}
                >
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center gap-3">
                      {file.type === 'folder' ? (
                        <Folder className="w-5 h-5 text-primary-600" />
                      ) : (
                        <span className="text-2xl">{getFileIcon(file.type)}</span>
                      )}
                      <div>
                        <span className="text-sm font-medium text-gray-900">{file.name}</span>
                        {file.aiOverview && (
                          <p className="text-xs text-gray-500 mt-1 max-w-md truncate">
                            {file.aiOverview}
                          </p>
                        )}
                      </div>
                    </div>
                  </td>

                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className="text-sm text-gray-500 uppercase">{file.type}</span>
                  </td>

                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className="text-sm text-gray-500">{formatFileSize(file.size)}</span>
                  </td>

                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className="text-sm text-gray-500">
                      {file.uploadedAt.toLocaleDateString()}
                    </span>
                  </td>

                  <td className="px-6 py-4 whitespace-nowrap text-right">
                    {file.type !== 'folder' && (
                      <div className="inline-flex items-center gap-1">
                        {onAnalyseFile && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation()
                              onAnalyseFile(file)
                            }}
                            className="text-gray-500 hover:text-violet-600 p-1 rounded hover:bg-violet-50"
                            title="Analyse with AI"
                          >
                            <Bot className="w-4 h-4" />
                          </button>
                        )}

                        {isVideoFile(file) && onAddSubtitle && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation()
                              onAddSubtitle(file)
                            }}
                            className="text-gray-500 hover:text-emerald-600 p-1 rounded hover:bg-emerald-50"
                            title="Add Subtitle"
                          >
                            <Subtitles className="w-4 h-4" />
                          </button>
                        )}

                        <button
                          onClick={(e) => {
                            e.stopPropagation()
                            onOpenFile(file)
                          }}
                          className="text-gray-500 hover:text-primary-600 p-1 rounded hover:bg-primary-50"
                          title="Preview"
                        >
                          <Eye className="w-4 h-4" />
                        </button>

                        <button
                          onClick={(e) => {
                            e.stopPropagation()
                            onDownloadFile(file)
                          }}
                          className="text-gray-500 hover:text-primary-600 p-1 rounded hover:bg-primary-50"
                          title="Download"
                        >
                          <Download className="w-4 h-4" />
                        </button>

                        <button
                          onClick={(e) => {
                            e.stopPropagation()
                            onDeleteFile(file.id)
                          }}
                          className="text-gray-500 hover:text-red-600 p-1 rounded hover:bg-red-50"
                          title="Delete"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    )
  }

  return (
    <div className="flex-1 overflow-y-auto p-6">
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
        {files.map((file) => (
          <div
            key={file.id}
            className="group relative bg-white/90 backdrop-blur rounded-xl border p-4 cursor-pointer transition-all hover:shadow-lg border-primary-100 hover:border-primary-300 hover:-translate-y-0.5"
            onMouseEnter={() => setHoveredFile(file.id)}
            onMouseLeave={() => setHoveredFile(null)}
            onClick={() => handleOpen(file)}
          >
            <div className="flex flex-col items-center text-center">
              <div className="mb-3">
                {file.type === 'folder' ? (
                  <Folder className="w-12 h-12 text-primary-600" />
                ) : (
                  <span className="text-5xl">{getFileIcon(file.type)}</span>
                )}
              </div>

              <h3 className="text-sm font-medium text-gray-900 mb-1 line-clamp-2">
                {file.name}
              </h3>

              <p className="text-xs text-gray-500 mb-2">{formatFileSize(file.size)}</p>
              <p className="text-xs text-gray-400">{file.uploadedAt.toLocaleDateString()}</p>

              {file.aiOverview && (
                <p className="text-xs text-gray-500 mt-2 line-clamp-2">
                  {file.aiOverview}
                </p>
              )}
            </div>

            {hoveredFile === file.id && file.type !== 'folder' && (
              <div className="absolute top-2 right-2 flex gap-1">
                {onAnalyseFile && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation()
                      onAnalyseFile(file)
                    }}
                    className="p-1.5 bg-white rounded-lg shadow-md hover:bg-violet-50 text-violet-600 ring-1 ring-violet-100"
                    title="Analyse with AI"
                  >
                    <Bot className="w-4 h-4" />
                  </button>
                )}

                {isVideoFile(file) && onAddSubtitle && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation()
                      onAddSubtitle(file)
                    }}
                    className="p-1.5 bg-white rounded-lg shadow-md hover:bg-emerald-50 text-emerald-600 ring-1 ring-emerald-100"
                    title="Add Subtitle"
                  >
                    <Subtitles className="w-4 h-4" />
                  </button>
                )}

                <button
                  onClick={(e) => {
                    e.stopPropagation()
                    onOpenFile(file)
                  }}
                  className="p-1.5 bg-white rounded-lg shadow-md hover:bg-primary-50 text-gray-600 ring-1 ring-primary-100"
                  title="Preview"
                >
                  <Eye className="w-4 h-4" />
                </button>

                <button
                  onClick={(e) => {
                    e.stopPropagation()
                    onDownloadFile(file)
                  }}
                  className="p-1.5 bg-white rounded-lg shadow-md hover:bg-primary-50 text-gray-600 ring-1 ring-primary-100"
                  title="Download"
                >
                  <Download className="w-4 h-4" />
                </button>

                <button
                  onClick={(e) => {
                    e.stopPropagation()
                    onDeleteFile(file.id)
                  }}
                  className="p-1.5 bg-white rounded-lg shadow-md hover:bg-red-50 text-red-600 ring-1 ring-red-100"
                  title="Delete"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}