import { create } from 'zustand'

const STORAGE_KEYS = {
  theme: 'cs.terminal.theme',
  fontSize: 'cs.terminal.font',
  autoCopy: 'cs.terminal.autoCopy',
  animations: 'cs.ui.animations',
  verbosity: 'cs.ai.verbosity',
  perfMode: 'cs.ui.perfMode',
}

const readSetting = (key, fallback) => {
  try {
    const val = localStorage.getItem(key)
    if (val === null) return fallback
    return val
  } catch {
    return fallback
  }
}

const writeSetting = (key, value) => {
  try {
    localStorage.setItem(key, String(value))
  } catch {
    // ignore
  }
}

/** Apply perf mode to the DOM — called on init and on every change. */
function applyPerfMode(mode) {
  if (typeof document === 'undefined') return
  const el = document.documentElement
  if (mode === 'low') {
    el.dataset.perf = 'low'
  } else {
    delete el.dataset.perf
  }
}

export const useSettingsStore = create((set) => ({
  terminalTheme: readSetting(STORAGE_KEYS.theme, 'dark'),
  terminalFont: Number(readSetting(STORAGE_KEYS.fontSize, '12.5')),
  autoCopy: readSetting(STORAGE_KEYS.autoCopy, 'false') === 'true',
  animations: readSetting(STORAGE_KEYS.animations, 'on'),
  verbosity: readSetting(STORAGE_KEYS.verbosity, 'balanced'),
  /** 'auto' | 'high' | 'low' — persisted, drives data-perf attribute on <html> */
  perfMode: readSetting(STORAGE_KEYS.perfMode, 'auto'),

  setTerminalTheme: (theme) => {
    writeSetting(STORAGE_KEYS.theme, theme)
    set({ terminalTheme: theme })
  },

  setTerminalFont: (size) => {
    const clamped = Math.min(20, Math.max(10, Number(size) || 12.5))
    writeSetting(STORAGE_KEYS.fontSize, clamped)
    set({ terminalFont: clamped })
  },

  setAutoCopy: (enabled) => {
    writeSetting(STORAGE_KEYS.autoCopy, enabled)
    set({ autoCopy: enabled })
  },

  setAnimations: (mode) => {
    writeSetting(STORAGE_KEYS.animations, mode)
    document.documentElement.dataset.animations = mode
    set({ animations: mode })
  },

  setVerbosity: (level) => {
    writeSetting(STORAGE_KEYS.verbosity, level)
    set({ verbosity: level })
  },

  setPerfMode: (mode) => {
    writeSetting(STORAGE_KEYS.perfMode, mode)
    applyPerfMode(mode)
    set({ perfMode: mode })
  },

  reset: () => {
    Object.values(STORAGE_KEYS).forEach((key) => localStorage.removeItem(key))
    const defaults = {
      terminalTheme: 'dark',
      terminalFont: 12.5,
      autoCopy: false,
      animations: 'on',
      verbosity: 'balanced',
      perfMode: 'auto',
    }
    document.documentElement.dataset.animations = 'on'
    applyPerfMode('auto')
    set(defaults)
  },
}))

// Apply initial states on page load
if (typeof document !== 'undefined') {
  document.documentElement.dataset.animations = readSetting(STORAGE_KEYS.animations, 'on')
  applyPerfMode(readSetting(STORAGE_KEYS.perfMode, 'auto'))
}
