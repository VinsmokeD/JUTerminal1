import { create } from 'zustand'
import api from '../lib/api'
import { useSessionStore } from './sessionStore'

export const useAuthStore = create((set) => ({
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
    let profileData = null
    try {
      const profile = await api.get('/auth/me')
      profileData = profile.data
      localStorage.setItem('skillLevel', profile.data.skill_level || 'beginner')
      localStorage.setItem('onboardingCompleted', profile.data.onboarding_completed ? 'true' : 'false')
      set({ skillLevel: profile.data.skill_level, onboardingCompleted: profile.data.onboarding_completed })
    } catch {}
    return { ...res.data, ...profileData }
  },

  register: async (username, password) => {
    const res = await api.post('/auth/register', { username, password })
    localStorage.setItem('token', res.data.access_token)
    localStorage.setItem('username', res.data.username)
    localStorage.setItem('skillLevel', 'beginner')
    localStorage.setItem('onboardingCompleted', 'false')
    set({ token: res.data.access_token, username: res.data.username, skillLevel: 'beginner', onboardingCompleted: false })
    return { ...res.data, role: 'student', skill_level: 'beginner', onboarding_completed: false }
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

  logout: (returnUrl = null) => {
    // Best-effort server-side revocation (adds the token's jti to the backend
    // Redis blocklist). Raw fetch with keepalive: bypasses the axios 401
    // interceptor (no recursion) and survives the navigation below. Any error
    // is ignored — local logout must always proceed.
    const existingToken = localStorage.getItem('token')
    if (existingToken) {
      try {
        fetch('/api/auth/logout', {
          method: 'POST',
          headers: { Authorization: `Bearer ${existingToken}` },
          keepalive: true,
        }).catch(() => {})
      } catch {
        /* ignore */
      }
    }
    localStorage.removeItem('token')
    localStorage.removeItem('username')
    localStorage.removeItem('skillLevel')
    localStorage.removeItem('onboardingCompleted')
    useSessionStore.getState().clearSession()
    set({ token: null, username: null, skillLevel: null, onboardingCompleted: false })
    if (returnUrl) {
      window.location.href = `/auth?returnUrl=${encodeURIComponent(returnUrl)}`
    } else {
      window.location.href = '/auth'
    }
  },

  checkAuth: async () => {
    if (!localStorage.getItem('token')) return false
    try {
      const profile = await api.get('/auth/me')
      localStorage.setItem('skillLevel', profile.data.skill_level || 'beginner')
      localStorage.setItem('onboardingCompleted', profile.data.onboarding_completed ? 'true' : 'false')
      set({ skillLevel: profile.data.skill_level, onboardingCompleted: profile.data.onboarding_completed })
      return true
    } catch {
      useAuthStore.getState().logout()
      return false
    }
  },
}))
