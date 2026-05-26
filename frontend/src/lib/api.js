import axios from 'axios'

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || '/api',
  timeout: 60000,
})

// Attach JWT from localStorage on every request
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token')
  if (token) config.headers.Authorization = `Bearer ${token}`
  return config
})

// Redirect to /auth on 401
api.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err.response?.status === 401) {
      localStorage.removeItem('token')
      localStorage.removeItem('username')
      localStorage.removeItem('skillLevel')
      localStorage.removeItem('onboardingCompleted')
      const currentPath = window.location.pathname
      if (currentPath !== '/auth' && currentPath !== '/') {
        window.location.href = `/auth?returnUrl=${encodeURIComponent(currentPath)}`
      } else {
        window.location.href = '/auth'
      }
    }
    return Promise.reject(err)
  }
)

export default api
