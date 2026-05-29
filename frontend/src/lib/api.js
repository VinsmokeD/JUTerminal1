import axios from 'axios'
import { useAuthStore } from '../store/authStore'

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || '/api',
  timeout: 60000,
})

// Attach JWT from localStorage on every request
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token')
  if (token) config.headers.Authorization = `Bearer ${token}`
  if (import.meta.env.DEV && config.url?.startsWith('/api')) {
    console.error(
      `[API Guard] Request URL "${config.url}" starts with "/api" which will cause a doubled prefix. Use a relative path instead.`
    )
  }
  return config
})

// Redirect to /auth on 401
api.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err.response?.status === 401) {
      const currentPath = window.location.pathname
      if (currentPath !== '/auth' && currentPath !== '/') {
        useAuthStore.getState().logout(currentPath)
      } else {
        useAuthStore.getState().logout()
      }
    }
    return Promise.reject(err)
  }
)

export default api
