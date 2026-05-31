import { create } from 'zustand'

/**
 * Global cursor store — drives ReticleCursor appearance.
 *
 * intent: 'default' | 'engage' | 'inspect' | 'launch'
 * mode:   'red' | 'blue' | 'neutral'   — tints the reticle ring
 * label:  string shown below cursor ('' = none)
 */
export const useCursorStore = create((set) => ({
  intent: 'default',
  label:  '',
  mode:   'neutral',

  setIntent: (intent) => set({ intent }),
  setLabel:  (label)  => set({ label }),
  setMode:   (mode)   => set({ mode }),

  setCursor: (intent, label = '', mode = 'neutral') => set({ intent, label, mode }),
  resetCursor: () => set({ intent: 'default', label: '', mode: 'neutral' }),
}))
