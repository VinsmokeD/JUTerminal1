import { create } from 'zustand'
import api from '../lib/api'

export const useAuthStore = create((set, get) => ({
  token: localStorage.getItem('token') || null,
  username: localStorage.getItem('username') || null,
  skillLevel: localStorage.getItem('skillLevel') || null,
  onboardingCompleted: localStorage.getItem('onboardingCompleted') === 'true',

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
    // Fetch profile to get skill level
    try {
      const profile = await api.get('/auth/me')
      localStorage.setItem('skillLevel', profile.data.skill_level || 'beginner')
      localStorage.setItem('onboardingCompleted', profile.data.onboarding_completed ? 'true' : 'false')
      set({ skillLevel: profile.data.skill_level, onboardingCompleted: profile.data.onboarding_completed })
    } catch {}
    return res.data
  },

  register: async (username, password) => {
    const res = await api.post('/auth/register', { username, password })
    localStorage.setItem('token', res.data.access_token)
    localStorage.setItem('username', res.data.username)
    localStorage.setItem('skillLevel', 'beginner')
    localStorage.setItem('onboardingCompleted', 'false')
    set({ token: res.data.access_token, username: res.data.username, skillLevel: 'beginner', onboardingCompleted: false })
    return res.data
  },

  setSkillLevel: async (level) => {
    try {
      await api.put('/auth/profile', { skill_level: level })
    } catch {}
    localStorage.setItem('skillLevel', level)
    set({ skillLevel: level })
  },

  completeOnboarding: async () => {
    try {
      await api.put('/auth/profile', { onboarding_completed: true })
    } catch {}
    localStorage.setItem('onboardingCompleted', 'true')
    set({ onboardingCompleted: true })
  },

  logout: () => {
    localStorage.removeItem('token')
    localStorage.removeItem('username')
    localStorage.removeItem('skillLevel')
    localStorage.removeItem('onboardingCompleted')
    set({ token: null, username: null, skillLevel: null, onboardingCompleted: false })
    window.location.href = '/auth'
  },
}))
