import { create } from 'zustand'

const STORAGE_KEY = 'cs.workspace.layouts.v1'

export const LAYOUT_PRESETS = {
  balanced: {
    label: 'Balanced',
    horizontal: [72, 28],
    main: [70, 30],
    side: [50, 50],
    collapsed: { sideCol: false, mainBottom: false, sideTop: false, sideBottom: false },
  },
  focus: {
    label: 'Focus',
    horizontal: [100, 0],
    main: [82, 18],
    side: [50, 50],
    collapsed: { sideCol: true, mainBottom: false, sideTop: true, sideBottom: true },
  },
  debug: {
    label: 'Debug',
    horizontal: [52, 48],
    main: [100, 0],
    side: [66, 34],
    collapsed: { sideCol: false, mainBottom: true, sideTop: false, sideBottom: false },
  },
}

export const layoutKeyFor = (role, scenarioId) => `${role || 'red'}:${scenarioId || 'unknown'}`

const clonePreset = (preset = 'balanced') => {
  const source = LAYOUT_PRESETS[preset] || LAYOUT_PRESETS.balanced
  return {
    preset,
    revision: Date.now(),
    horizontal: [...source.horizontal],
    main: [...source.main],
    side: [...source.side],
    collapsed: { ...source.collapsed },
    fullscreen: null,
  }
}

const readLayouts = () => {
  try {
    const parsed = JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}')
    return parsed && typeof parsed === 'object' ? parsed : {}
  } catch {
    return {}
  }
}

const persist = (layouts) => {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(layouts))
  } catch {
    // ignore persistence failures
  }
}

const updateLayout = (set, key, updater) => {
  set((state) => {
    const current = state.layouts[key] || clonePreset('balanced')
    const next = updater(current)
    const layouts = { ...state.layouts, [key]: next }
    persist(layouts)
    return { layouts }
  })
}

export const useLayoutStore = create((set, get) => ({
  layouts: readLayouts(),

  ensureLayout: (role, scenarioId) => {
    const key = layoutKeyFor(role, scenarioId)
    if (get().layouts[key]) return
    updateLayout(set, key, () => clonePreset('balanced'))
  },

  getLayout: (role, scenarioId) => {
    const key = layoutKeyFor(role, scenarioId)
    return get().layouts[key] || clonePreset('balanced')
  },

  setSizes: (role, scenarioId, region, sizes) => {
    const key = layoutKeyFor(role, scenarioId)
    updateLayout(set, key, (layout) => ({
      ...layout,
      [region]: sizes.map((size) => Number(size.toFixed(2))),
    }))
  },

  applyPreset: (role, scenarioId, preset) => {
    const key = layoutKeyFor(role, scenarioId)
    updateLayout(set, key, () => clonePreset(preset))
  },

  toggleCollapsed: (role, scenarioId, panelId) => {
    const key = layoutKeyFor(role, scenarioId)
    updateLayout(set, key, (layout) => ({
      ...layout,
      revision: Date.now(),
      collapsed: {
        ...layout.collapsed,
        [panelId]: !layout.collapsed?.[panelId],
      },
    }))
  },

  setFullscreen: (role, scenarioId, panelId) => {
    const key = layoutKeyFor(role, scenarioId)
    updateLayout(set, key, (layout) => ({
      ...layout,
      fullscreen: panelId,
    }))
  },

  clearFullscreen: (role, scenarioId) => {
    const key = layoutKeyFor(role, scenarioId)
    updateLayout(set, key, (layout) => ({ ...layout, fullscreen: null }))
  },

  resetLayout: (role, scenarioId) => {
    const key = layoutKeyFor(role, scenarioId)
    updateLayout(set, key, () => clonePreset('balanced'))
  },
}))
