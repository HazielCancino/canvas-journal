import axios from 'axios'

const BASE   = import.meta.env.VITE_API_URL || 'http://localhost:5000/api'
const ORIGIN = BASE.replace('/api', '')   // e.g. http://100.100.190.36:5000

const api = axios.create({ baseURL: BASE })

// Converts any URL the backend returns into an absolute URL.
// "/api/media/cover/x.jpg" → "http://100.100.190.36:5000/api/media/cover/x.jpg"
// "http://..."             → unchanged
// null / undefined         → null
export function resolveUrl(path) {
  if (!path) return null
  if (path.startsWith('http')) return path
  return `${ORIGIN}${path.startsWith('/') ? '' : '/'}${path}`
}

// The raw origin (no /api) — used by EmbedNode and BoardList for direct fetch calls
export { ORIGIN }

export const boardsApi = {
  list:      (archived = false) => api.get(`/boards/?archived=${archived}`),
  get:       (id)               => api.get(`/boards/${id}`),
  create:    (data)             => api.post('/boards/', data),
  update:    (id, data)         => api.put(`/boards/${id}`, data),
  delete:    (id)               => api.delete(`/boards/${id}`),
  save:      (id, canvasState)  => api.post(`/boards/${id}/save`, { canvas_state: canvasState }),
  rename:    (id, name)         => api.post(`/boards/${id}/rename`, { name }),
  pin:       (id)               => api.post(`/boards/${id}/pin`),
  archive:   (id)               => api.post(`/boards/${id}/archive`),
  priority:  (id, priority)     => api.post(`/boards/${id}/priority`, { priority }),
  tags:      (id, tags)         => api.post(`/boards/${id}/tags`, { tags }),
  duplicate: (id)               => api.post(`/boards/${id}/duplicate`),
}

export const mediaApi = {
  upload: (boardId, file) => {
    const fd = new FormData()
    fd.append('file', file)
    return api.post(`/media/upload/${boardId}`, fd)
  },
  url:    (filename) => `${ORIGIN}/api/media/file/${filename}`,
  list:   (boardId)  => api.get(`/media/board/${boardId}`),
  delete: (id)       => api.delete(`/media/${id}`),
}