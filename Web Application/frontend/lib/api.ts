const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:8000/api'

function getStoredToken() {
  if (typeof window === 'undefined') return null

  return (
    localStorage.getItem('token') ||
    localStorage.getItem('access_token') ||
    localStorage.getItem('authToken')
  )
}

function getAuthHeaders(isJson: boolean = true) {
  const token = getStoredToken()
  const headers: Record<string, string> = {}

  if (token) {
    headers['Authorization'] = `Bearer ${token}`
  }

  if (isJson) {
    headers['Content-Type'] = 'application/json'
  }

  return headers
}

async function handleResponse(response: Response) {
  if (!response.ok) {
    let message = 'Request failed'

    try {
      const data = await response.json()
      message = data.detail || data.message || message
    } catch {
      message = `${response.status} ${response.statusText}`
    }

    if (response.status === 401) {
      message = 'Unauthorized. Please log in again.'
    }

    throw new Error(message)
  }

  const contentType = response.headers.get('content-type') || ''

  if (contentType.includes('application/json')) {
    return response.json()
  }

  return response
}

export async function getFiles(folderId: string | null = null) {
  const url = folderId
    ? `${API_BASE_URL}/files?folder_id=${encodeURIComponent(folderId)}`
    : `${API_BASE_URL}/files`

  const response = await fetch(url, {
    method: 'GET',
    headers: getAuthHeaders(false),
  })

  return handleResponse(response)
}

export async function uploadFile(file: File, folderId: string | null = null) {
  const token = getStoredToken()
  const formData = new FormData()

  formData.append('file', file)

  if (folderId) {
    formData.append('folder_id', folderId)
  }

  const response = await fetch(`${API_BASE_URL}/files/upload`, {
    method: 'POST',
    headers: token ? { Authorization: `Bearer ${token}` } : {},
    body: formData,
  })

  return handleResponse(response)
}

export async function deleteFile(fileId: string) {
  const response = await fetch(`${API_BASE_URL}/files/${fileId}`, {
    method: 'DELETE',
    headers: getAuthHeaders(false),
  })

  return handleResponse(response)
}

export async function fetchPreviewBlob(fileId: string) {
  const response = await fetch(`${API_BASE_URL}/files/${fileId}/preview`, {
    method: 'GET',
    headers: getAuthHeaders(false),
  })

  if (!response.ok) {
    let message = 'Preview failed'

    try {
      const data = await response.json()
      message = data.detail || message
    } catch {
      message = `${response.status} ${response.statusText}`
    }

    if (response.status === 401) {
      message = 'Unauthorized. Please log in again.'
    }

    throw new Error(message)
  }

  return await response.blob()
}
// export async function addSubtitleToVideo(fileId: string) {
//   const response = await fetch(`${API_BASE_URL}/videos/${fileId}/add-subtitle`, {
//     method: 'POST',
//     headers: getAuthHeaders(),
//   })

//   return handleResponse(response)
// }

export async function addSubtitleToVideo(
  fileId: string,
  language: string,
  outputFilename: string
) {
  const response = await fetch(`${API_BASE_URL}/videos/${fileId}/add-subtitle`, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify({
      language,
      output_filename: outputFilename,
    }),
  })

  return handleResponse(response)
}


export async function triggerFileDownload(fileId: string, fileName: string) {
  const response = await fetch(`${API_BASE_URL}/files/${fileId}/download`, {
    method: 'GET',
    headers: getAuthHeaders(false),
  })

  if (!response.ok) {
    let message = 'Download failed'

    try {
      const data = await response.json()
      message = data.detail || message
    } catch {
      message = `${response.status} ${response.statusText}`
    }

    if (response.status === 401) {
      message = 'Unauthorized. Please log in again.'
    }

    throw new Error(message)
  }

  const blob = await response.blob()
  const url = window.URL.createObjectURL(blob)

  const a = document.createElement('a')
  a.href = url
  a.download = fileName
  document.body.appendChild(a)
  a.click()
  a.remove()

  window.URL.revokeObjectURL(url)
}

export async function getFolders() {
  const response = await fetch(`${API_BASE_URL}/folders`, {
    method: 'GET',
    headers: getAuthHeaders(false),
  })

  return handleResponse(response)
}

export async function createFolder(name: string) {
  const response = await fetch(`${API_BASE_URL}/folders`, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify({ name }),
  })

  return handleResponse(response)
}

export async function searchFilesByAI(prompt: string) {
  const response = await fetch(`${API_BASE_URL}/ai-search`, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify({ prompt }),
  })

  return handleResponse(response)
}

export async function updateAIOverview(fileId: string, aiOverview: string) {
  const response = await fetch(`${API_BASE_URL}/ai-overview/${fileId}`, {
    method: 'PUT',
    headers: getAuthHeaders(),
    body: JSON.stringify({ ai_overview: aiOverview }),
  })

  return handleResponse(response)
}
export async function analyseFileWithAI(fileId: string) {
  let response = await fetch(`${API_BASE_URL}/file-rag/analyse`, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify({ file_id: fileId }),
  })

  if (response.status === 404) {
    response = await fetch(`${API_BASE_URL}/file-rag/analyze`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify({ file_id: fileId }),
    })
  }

  return handleResponse(response)
}
export async function chatWithAnalysedFile(
  fileId: string,
  message: string,
  sessionId: string | null = null
) {
  const response = await fetch(`${API_BASE_URL}/file-rag/chat`, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify({
      file_id: fileId,
      message,
      session_id: sessionId,
    }),
  })

  return handleResponse(response)
}

export async function getFileChatSession(fileId: string) {
  const response = await fetch(`${API_BASE_URL}/file-rag/sessions/${fileId}`, {
    method: 'GET',
    headers: getAuthHeaders(false),
  })

  return handleResponse(response)
}