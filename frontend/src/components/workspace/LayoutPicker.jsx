import { useEffect } from 'react'
import { LAYOUT_PRESETS, layoutKeyFor, useLayoutStore } from '../../store/layoutStore'

export default function LayoutPicker({ role, scenarioId }) {
  const key = layoutKeyFor(role, scenarioId)
  const layout = useLayoutStore((state) => state.layouts[key])
  const ensureLayout = useLayoutStore((state) => state.ensureLayout)
  const applyPreset = useLayoutStore((state) => state.applyPreset)
  const resetLayout = useLayoutStore((state) => state.resetLayout)

  useEffect(() => {
    ensureLayout(role, scenarioId)
  }, [ensureLayout, role, scenarioId])

  return (
    <div className="layout-picker" aria-label="Workspace layout presets">
      {Object.entries(LAYOUT_PRESETS).map(([id, preset]) => (
        <button
          key={id}
          type="button"
          className={(layout?.preset || 'balanced') === id ? 'active' : ''}
          onClick={() => applyPreset(role, scenarioId, id)}
          title={`${preset.label} workspace layout`}
        >
          {preset.label}
        </button>
      ))}
      <button type="button" onClick={() => resetLayout(role, scenarioId)} title="Reset workspace layout">
        Reset
      </button>
    </div>
  )
}
