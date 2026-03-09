import axios from 'axios'

const api = axios.create({ baseURL: 'http://localhost:5000/api' })

export const boardsApi = {
  list: ()                          => api.get('/boards/'),
  get: (id)                         => api.get(`/boards/${id}`),
  create: (data)                    => api.post('/boards/', data),
  update: (id, data)                => api.put(`/boards/${id}`, data),
  save: (id, canvas_state)          => api.post(`/boards/${id}/save`, { canvas_state }),
  delete: (id)                      => api.delete(`/boards/${id}`),
}

export const mediaApi = {
  upload: (boardId, file) => {
    const form = new FormData()
    form.append('file', file)
    return api.post(`/media/upload/${boardId}`, form, {
      headers: { 'Content-Type': 'multipart/form-data' }
    })
  },
  list: (boardId)   => api.get(`/media/board/${boardId}`),
  delete: (mediaId) => api.delete(`/media/${mediaId}`),
  url: (filename)   => `http://localhost:5000/api/media/file/${filename}`,
}
