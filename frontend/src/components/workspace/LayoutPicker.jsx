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

  const handleSelectChange = (e) => {
    const val = e.target.value
    if (val === 'reset') {
      resetLayout(role, scenarioId)
    } else {
      applyPreset(role, scenarioId, val)
    }
  }

  return (
    <div className="flex items-center" aria-label="Workspace layout presets">
      <select
        value={layout?.preset || 'balanced'}
        onChange={handleSelectChange}
        className="
          bg-surface-3 border border-cs-border text-txt-secondary hover:text-txt-primary
          text-[11px] font-mono rounded-cs-sm px-2.5 py-1 pr-6 cursor-pointer
          appearance-none focus:outline-none focus:ring-1 focus:ring-cs-blue/30
          transition-all duration-200
        "
        style={{
          backgroundImage: `url("data:image/svg+xml;charset=utf-8,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 20 20'%3E%3Cpath stroke='%23888888' stroke-linecap='round' stroke-linejoin='round' stroke-width='1.5' d='m6 8 4 4 4-4'/%3E%3C/svg%3E")`,
          backgroundPosition: 'right 0.25rem center',
          backgroundSize: '1.25em 1.25em',
          backgroundRepeat: 'no-repeat',
        }}
      >
        {Object.entries(LAYOUT_PRESETS).map(([id, preset]) => (
          <option key={id} value={id} className="bg-surface-3">
            {preset.label} Layout
          </option>
        ))}
        <option value="reset" className="bg-surface-3">Reset Layout</option>
      </select>
    </div>
  )
}
