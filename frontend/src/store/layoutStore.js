import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export const LAYOUT_PRESETS = {
  balanced: {
    label: 'Balanced',
    horizontal: [65, 35],
    main: [65, 35],
    side: [50, 50],
    collapsed: { sideCol: false, mainBottom: false, sideTop: false, sideBottom: false },
  },
  focus: {
    label: 'Focus',
    horizontal: [100, 0],
    main: [80, 20],
    side: [50, 50],
    collapsed: { sideCol: true, mainBottom: false, sideTop: false, sideBottom: false },
  },
  debug: {
    label: 'Debug',
    horizontal: [50, 50],
    main: [100, 0],
    side: [0, 100],
    collapsed: { sideCol: false, mainBottom: true, sideTop: true, sideBottom: false },
  },
}

export function layoutKeyFor(role, scenarioId) {
  return `${role}:${scenarioId || 'global'}`
}

export const useLayoutStore = create(
  persist(
    (set) => ({
      layouts: {},

      ensureLayout: (role, scenarioId) => set((state) => {
        const key = layoutKeyFor(role, scenarioId)
        if (state.layouts[key]) return state
        return {
          layouts: {
            ...state.layouts,
            [key]: { ...LAYOUT_PRESETS.balanced, preset: 'balanced', revision: 0, fullscreen: null },
          },
        }
      }),

      applyPreset: (role, scenarioId, presetId) => set((state) => {
        const key = layoutKeyFor(role, scenarioId)
        const preset = LAYOUT_PRESETS[presetId] || LAYOUT_PRESETS.balanced
        return {
          layouts: {
            ...state.layouts,
            [key]: { ...preset, preset: presetId, revision: (state.layouts[key]?.revision || 0) + 1, fullscreen: null },
          },
        }
      }),

      resetLayout: (role, scenarioId) => set((state) => {
        const key = layoutKeyFor(role, scenarioId)
        const presetId = state.layouts[key]?.preset || 'balanced'
        const preset = LAYOUT_PRESETS[presetId] || LAYOUT_PRESETS.balanced
        return {
          layouts: {
            ...state.layouts,
            [key]: { ...preset, preset: presetId, revision: (state.layouts[key]?.revision || 0) + 1, fullscreen: null },
          },
        }
      }),

      setSizes: (role, scenarioId, region, sizes) => set((state) => {
        const key = layoutKeyFor(role, scenarioId)
        const current = state.layouts[key] || { ...LAYOUT_PRESETS.balanced, preset: 'balanced', revision: 0 }
        return {
          layouts: {
            ...state.layouts,
            [key]: { ...current, [region]: sizes, preset: 'custom' },
          },
        }
      }),

      toggleCollapsed: (role, scenarioId, panelId) => set((state) => {
        const key = layoutKeyFor(role, scenarioId)
        const current = state.layouts[key] || { ...LAYOUT_PRESETS.balanced, preset: 'balanced', revision: 0 }
        return {
          layouts: {
            ...state.layouts,
            [key]: {
              ...current,
              collapsed: { ...current.collapsed, [panelId]: !current.collapsed[panelId] },
              preset: 'custom',
            },
          },
        }
      }),

      setFullscreen: (role, scenarioId, panelId) => set((state) => {
        const key = layoutKeyFor(role, scenarioId)
        const current = state.layouts[key] || { ...LAYOUT_PRESETS.balanced, preset: 'balanced', revision: 0 }
        return {
          layouts: {
            ...state.layouts,
            [key]: { ...current, fullscreen: panelId },
          },
        }
      }),

      clearFullscreen: (role, scenarioId) => set((state) => {
        const key = layoutKeyFor(role, scenarioId)
        const current = state.layouts[key]
        if (!current || !current.fullscreen) return state
        return {
          layouts: {
            ...state.layouts,
            [key]: { ...current, fullscreen: null },
          },
        }
      }),
    }),
    {
      name: 'parallax-layout-storage-v2',
    }
  )
)
