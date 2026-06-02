import { create } from 'zustand'
import api from '../lib/api'

const eventTime = (event) => Date.parse(event?.timestamp || event?.created_at || '') || 0
const newestFirst = (events = []) => [...events].sort((a, b) => eventTime(b) - eventTime(a))

// A SIEM event id is globally unique; prefer it so the same event delivered by
// both the live WS push and the polling self-heal merge is deduped reliably
// regardless of timestamp-field differences between the two payload shapes.
const eventKeyOf = (event) =>
  event?.id
    ? `id:${event.id}`
    : `${event?.message || 'event'}:${event?.timestamp || event?.created_at || ''}`

const mergeEvents = (existing = [], incoming = []) => {
  const seen = new Set(existing.map(eventKeyOf))
  const merged = [...existing]
  for (const ev of incoming) {
    const key = eventKeyOf(ev)
    if (seen.has(key)) continue
    seen.add(key)
    merged.push(ev)
  }
  return newestFirst(merged).slice(0, 200)
}

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
    const eventKey = eventKeyOf(event)
    const alreadyPresent = s.siemEvents.some((existing) => eventKeyOf(existing) === eventKey)
    if (alreadyPresent) return s
    return { siemEvents: newestFirst([event, ...s.siemEvents]).slice(0, 200) }
  }),

  // Merge a batch (e.g. from the polling self-heal) without dropping live events
  // that arrived via WS. Dedup is by unique event id.
  mergeSiemEvents: (events) => set((s) => ({
    siemEvents: mergeEvents(s.siemEvents, events || []),
  })),

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
