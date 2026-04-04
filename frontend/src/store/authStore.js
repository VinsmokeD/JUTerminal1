import { create } from 'zustand'
import api from '../lib/api'

export const useAuthStore = create((set) => ({
  token: localStorage.getItem('token') || null,
  username: localStorage.getItem('username') || null,

  login: async (username, password) => {
    const params = new URLSearchParams()
    params.append('username', username)
    params.append('password', password)
    const res = await api.post('/auth/login', params, {
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    })
    localStorage.setItem('token', res.data.access_token)
    localStorage.setItem('username', res.data.username)
    set({ token: res.data.access_token, username: res.data.username })
    return res.data
  },

  register: async (username, password) => {
    const res = await api.post('/auth/register', { username, password })
    localStorage.setItem('token', res.data.access_token)
    localStorage.setItem('username', res.data.username)
    set({ token: res.data.access_token, username: res.data.username })
    return res.data
  },

  logout: () => {
    localStorage.removeItem('token')
    localStorage.removeItem('username')
    set({ token: null, username: null })
    window.location.href = '/auth'
  },
}))
