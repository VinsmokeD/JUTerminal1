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
  x: -200,
  y: -200,

  setIntent: (intent) => set({ intent }),
  setLabel:  (label)  => set({ label }),
  setMode:   (mode)   => set({ mode }),
  setPosition: (x, y) => set({ x, y }),

  setCursor: (intent, label = '', mode = 'neutral') => set({ intent, label, mode }),
  resetCursor: () => set({ intent: 'default', label: '', mode: 'neutral' }),
}))
