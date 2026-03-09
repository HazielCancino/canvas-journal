import axios from 'axios'

const api = axios.create({ baseURL: 'http://localhost:5000/api' })

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
  url:    (filename) => `http://localhost:5000/api/media/file/${filename}`,
  list:   (boardId)  => api.get(`/media/board/${boardId}`),
  delete: (id)       => api.delete(`/media/${id}`),
}