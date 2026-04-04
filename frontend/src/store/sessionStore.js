import { create } from 'zustand'
import api from '../lib/api'

export const useSessionStore = create((set, get) => ({
  scenarios: [],
  currentSession: null,
  phase: 1,
  score: 100,
  siemEvents: [],

  fetchScenarios: async () => {
    const res = await api.get('/scenarios/')
    set({ scenarios: res.data })
  },

  startSession: async (scenarioId, role, methodology) => {
    const res = await api.post('/sessions/start', { scenario_id: scenarioId, role, methodology })
    set({ currentSession: res.data, phase: res.data.phase, score: res.data.score, siemEvents: [] })
    return res.data
  },

  acknowledgeRoe: async (sessionId) => {
    await api.post('/sessions/roe-ack', { session_id: sessionId })
    set((s) => ({ currentSession: s.currentSession ? { ...s.currentSession, roe_acknowledged: true } : null }))
  },

  setPhase: (phase) => set({ phase }),

  setScore: (score) => set({ score }),

  addSiemEvent: (event) => set((s) => ({ siemEvents: [event, ...s.siemEvents].slice(0, 200) })),

  clearSession: () => set({ currentSession: null, phase: 1, score: 100, siemEvents: [] }),
}))
