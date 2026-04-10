import { create } from 'zustand'
import api from '../lib/api'

export const useSessionStore = create((set, get) => ({
  scenarios: [],
  currentSession: null,
  phase: 1,
  score: 100,
  siemEvents: [],
  aiMode: 'learn',
  discoveries: { services: [], paths: [], vulns: [], credentials: [] },
  pendingEvidence: null, // auto-evidence waiting for user confirmation

  fetchScenarios: async () => {
    const res = await api.get('/scenarios/')
    set({ scenarios: res.data })
  },

  startSession: async (scenarioId, role, methodology) => {
    const res = await api.post('/sessions/start', { scenario_id: scenarioId, role, methodology })
    set({
      currentSession: res.data,
      phase: res.data.phase,
      score: res.data.score,
      siemEvents: [],
      aiMode: res.data.ai_mode || 'learn',
      discoveries: { services: [], paths: [], vulns: [], credentials: [] },
      pendingEvidence: null,
    })
    return res.data
  },

  acknowledgeRoe: async (sessionId) => {
    await api.post('/sessions/roe-ack', { session_id: sessionId })
    set((s) => ({ currentSession: s.currentSession ? { ...s.currentSession, roe_acknowledged: true } : null }))
  },

  setPhase: (phase) => set({ phase }),
  setScore: (score) => set({ score }),
  setAiMode: (mode) => set({ aiMode: mode }),

  addSiemEvent: (event) => set((s) => ({ siemEvents: [event, ...s.siemEvents].slice(0, 200) })),

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
    currentSession: null, phase: 1, score: 100, siemEvents: [],
    aiMode: 'learn', discoveries: { services: [], paths: [], vulns: [], credentials: [] },
    pendingEvidence: null,
  }),
}))
