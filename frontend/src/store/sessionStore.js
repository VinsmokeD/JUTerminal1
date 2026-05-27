import { create } from 'zustand'
import api from '../lib/api'

const eventTime = (event) => Date.parse(event?.timestamp || event?.created_at || '') || 0
const newestFirst = (events = []) => [...events].sort((a, b) => eventTime(b) - eventTime(a))

export const useSessionStore = create((set, get) => ({
  scenarios: [],
  currentSession: null,
  activeSession: null,
  phase: 1,
  score: 100,
  siemEvents: [],
  aiMode: 'learn',
  activeBranch: null,
  discoveries: { services: [], paths: [], vulns: [], credentials: [] },
  pendingEvidence: null, // auto-evidence waiting for user confirmation
  lastVisitedRole: null,
  setLastVisitedRole: (role) => set({ lastVisitedRole: role }),

  fetchScenarios: async () => {
    const res = await api.get('/scenarios/')
    set({ scenarios: res.data })
  },

  fetchActiveSession: async () => {
    try {
      const res = await api.get('/sessions/active')
      set({ activeSession: res.data })
      return res.data
    } catch {
      set({ activeSession: null })
      return null
    }
  },

  startSession: async (scenarioId, role, methodology) => {
    const res = await api.post('/sessions/start', { scenario_id: scenarioId, role, methodology })
    set({
      currentSession: res.data,
      activeSession: res.data,
      phase: res.data.phase,
      score: res.data.score,
      siemEvents: [],
      aiMode: res.data.ai_mode || 'learn',
      activeBranch: null,
      discoveries: { services: [], paths: [], vulns: [], credentials: [] },
      pendingEvidence: null,
    })
    return res.data
  },

  acknowledgeRoe: async (sessionId) => {
    await api.post('/sessions/roe-ack', { session_id: sessionId })
    set((s) => ({ currentSession: s.currentSession ? { ...s.currentSession, roe_acknowledged: true } : null }))
  },

  setCurrentSession: (session) => set({
    currentSession: session,
    phase: session?.phase ?? 1,
    score: session?.score ?? 100,
    aiMode: session?.ai_mode || get().aiMode || 'learn',
  }),
  setPhase: (phase) => set({ phase }),
  setScore: (score) => set({ score }),
  setAiMode: (mode) => set({ aiMode: mode }),
  setActiveBranch: (branch) => set({ activeBranch: branch }),
  setSiemEvents: (events) => set({ siemEvents: newestFirst(events || []).slice(0, 200) }),

  addSiemEvent: (event) => set((s) => {
    const eventKey = `${event?.id || event?.message || 'event'}:${event?.timestamp || event?.created_at || ''}`
    const alreadyPresent = s.siemEvents.some((existing) => {
      const existingKey = `${existing?.id || existing?.message || 'event'}:${existing?.timestamp || existing?.created_at || ''}`
      return existingKey === eventKey
    })
    if (alreadyPresent) return s
    return { siemEvents: newestFirst([event, ...s.siemEvents]).slice(0, 200) }
  }),

  addDiscoveries: (newDiscoveries) => set((s) => {
    const d = { ...s.discoveries }
    for (const [key, items] of Object.entries(newDiscoveries)) {
      if (items && items.length > 0) {
        d[key] = [...new Set([...d[key], ...items])]
      }
    }
    return { discoveries: d }
  }),

  setPendingEvidence: (evidence) => set({ pendingEvidence: evidence }),
  clearPendingEvidence: () => set({ pendingEvidence: null }),

  clearSession: () => set({
    currentSession: null, activeSession: null, phase: 1, score: 100, siemEvents: [],
    aiMode: 'learn', activeBranch: null, discoveries: { services: [], paths: [], vulns: [], credentials: [] },
    pendingEvidence: null, lastVisitedRole: null,
  }),
}))
