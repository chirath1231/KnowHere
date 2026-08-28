export interface FileItem {
  id: string
  name: string
  type: string
  size: number
  folderId?: string | null
  uploadedAt: Date
  aiOverview?: string
  contentType?: string
}

export function normalizeFileItem(item: any): FileItem {
  return {
    id: item.id,
    name: item.name || "Unnamed",
    type: item.type || "file",
    size: item.size || 0,
    folderId: item.folder_id ?? null,
    uploadedAt: item.uploaded_at ? new Date(item.uploaded_at) : new Date(),
    aiOverview: item.ai_overview || "",
    contentType: item.content_type || "",
  }
}

export function formatFileSize(bytes: number = 0): string {
  if (bytes === 0) return "0 B"

  const sizes = ["B", "KB", "MB", "GB", "TB"]
  const i = Math.floor(Math.log(bytes) / Math.log(1024))
  return `${(bytes / Math.pow(1024, i)).toFixed(2)} ${sizes[i]}`
}

export function getFileIcon(type: string): string {
  switch ((type || "").toLowerCase()) {
    case "image":
      return "🖼️"
    case "video":
      return "🎥"
    case "audio":
      return "🎵"
    case "pdf":
      return "📄"
    case "text":
      return "📝"
    case "folder":
      return "📁"
    default:
      return "📦"
  }
}