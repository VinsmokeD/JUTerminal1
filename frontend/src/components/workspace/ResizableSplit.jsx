import { useEffect, useMemo } from 'react'
import { Group, Panel, Separator } from 'react-resizable-panels'
import { layoutKeyFor, useLayoutStore } from '../../store/layoutStore'

const PANEL_LABELS = {
  mainTop: 'Primary',
  mainBottom: 'Notebook',
  sideTop: 'Support',
  sideBottom: 'Telemetry',
}

export default function ResizableSplit({ role = 'red', scenarioId, slots }) {
  const key = layoutKeyFor(role, scenarioId)
  const layout = useLayoutStore((state) => state.layouts[key])
  const ensureLayout = useLayoutStore((state) => state.ensureLayout)
  const setSizes = useLayoutStore((state) => state.setSizes)
  const toggleCollapsed = useLayoutStore((state) => state.toggleCollapsed)
  const setFullscreen = useLayoutStore((state) => state.setFullscreen)
  const clearFullscreen = useLayoutStore((state) => state.clearFullscreen)

  useEffect(() => {
    ensureLayout(role, scenarioId)
  }, [ensureLayout, role, scenarioId])

  const activeLayout = layout || {
    preset: 'balanced',
    revision: 0,
    horizontal: [72, 28],
    main: [70, 30],
    side: [50, 50],
    collapsed: { sideCol: false, mainBottom: false, sideTop: false, sideBottom: false },
    fullscreen: null,
  }

  useEffect(() => {
    if (!activeLayout.fullscreen) return undefined
    const onKey = (event) => {
      if (event.key === 'Escape') clearFullscreen(role, scenarioId)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [activeLayout.fullscreen, clearFullscreen, role, scenarioId])

  const collapsed = activeLayout.collapsed || {}
  const horizontal = collapsed.sideCol ? [100, 0] : activeLayout.horizontal
  const main = collapsed.mainBottom ? [100, 0] : activeLayout.main
  const side = useMemo(() => {
    if (collapsed.sideTop && collapsed.sideBottom) return [50, 50]
    if (collapsed.sideTop) return [0, 100]
    if (collapsed.sideBottom) return [100, 0]
    return activeLayout.side
  }, [activeLayout.side, collapsed.sideBottom, collapsed.sideTop])

  const fullscreenSlot = activeLayout.fullscreen ? slots[activeLayout.fullscreen] : null

  return (
    <div className={`workspace-resizable workspace-resizable-${role}`}>
      <Group
        key={`${key}:h:${activeLayout.revision}`}
        orientation="horizontal"
        defaultLayout={{ main: horizontal[0], side: horizontal[1] }}
        onLayoutChanged={(sizes) => !collapsed.sideCol && setSizes(role, scenarioId, 'horizontal', pickSizes(sizes, ['main', 'side']))}
      >
        <Panel id="main" defaultSize={`${horizontal[0]}%`} minSize="38%">
          <Group
            key={`${key}:m:${activeLayout.revision}`}
            orientation="vertical"
            defaultLayout={{ mainTop: main[0], mainBottom: main[1] }}
            onLayoutChanged={(sizes) => !collapsed.mainBottom && setSizes(role, scenarioId, 'main', pickSizes(sizes, ['mainTop', 'mainBottom']))}
          >
            <Panel id="mainTop" defaultSize={`${main[0]}%`} minSize="34%">
              <SlotFrame id="mainTop" role={role} slot={slots.mainTop} onFullscreen={setFullscreen} onToggle={toggleCollapsed} scenarioId={scenarioId} />
            </Panel>
            <ResizeHandle role={role} direction="vertical" hidden={collapsed.mainBottom} />
            <Panel id="mainBottom" defaultSize={`${main[1]}%`} minSize={collapsed.mainBottom ? '0%' : '18%'}>
              <SlotFrame id="mainBottom" role={role} collapsed={collapsed.mainBottom} slot={slots.mainBottom} onFullscreen={setFullscreen} onToggle={toggleCollapsed} scenarioId={scenarioId} />
            </Panel>
          </Group>
        </Panel>

        <ResizeHandle role={role} direction="horizontal" hidden={collapsed.sideCol} />

        <Panel id="side" defaultSize={`${horizontal[1]}%`} minSize={collapsed.sideCol ? '0%' : '18%'}>
          {collapsed.sideCol ? (
            <CollapsedStrip label="Side panels" role={role} onExpand={() => toggleCollapsed(role, scenarioId, 'sideCol')} />
          ) : (
            <Group
              key={`${key}:s:${activeLayout.revision}`}
              orientation="vertical"
              defaultLayout={{ sideTop: side[0], sideBottom: side[1] }}
              onLayoutChanged={(sizes) => !(collapsed.sideTop || collapsed.sideBottom) && setSizes(role, scenarioId, 'side', pickSizes(sizes, ['sideTop', 'sideBottom']))}
            >
              <Panel id="sideTop" defaultSize={`${side[0]}%`} minSize={collapsed.sideTop ? '0%' : '18%'}>
                <SlotFrame id="sideTop" role={role} collapsed={collapsed.sideTop} slot={slots.sideTop} onFullscreen={setFullscreen} onToggle={toggleCollapsed} scenarioId={scenarioId} />
              </Panel>
              <ResizeHandle role={role} direction="vertical" hidden={collapsed.sideTop || collapsed.sideBottom} />
              <Panel id="sideBottom" defaultSize={`${side[1]}%`} minSize={collapsed.sideBottom ? '0%' : '18%'}>
                <SlotFrame id="sideBottom" role={role} collapsed={collapsed.sideBottom} slot={slots.sideBottom} onFullscreen={setFullscreen} onToggle={toggleCollapsed} scenarioId={scenarioId} />
              </Panel>
            </Group>
          )}
        </Panel>
      </Group>

      {fullscreenSlot && (
        <div className="workspace-fullscreen" role="dialog" aria-modal="true" aria-label={`${fullscreenSlot.label || PANEL_LABELS[activeLayout.fullscreen]} fullscreen`}>
          <div className="workspace-fullscreen-bar">
            <span>{fullscreenSlot.label || PANEL_LABELS[activeLayout.fullscreen]}</span>
            <button type="button" onClick={() => clearFullscreen(role, scenarioId)}>Exit fullscreen</button>
          </div>
          <div className="min-h-0 flex-1 overflow-hidden">{fullscreenSlot.element}</div>
        </div>
      )}
    </div>
  )
}

function pickSizes(layout, ids) {
  return ids.map((id) => Number(layout?.[id] || 0))
}

function SlotFrame({ id, role, scenarioId, slot, collapsed, onToggle, onFullscreen }) {
  const label = slot?.label || PANEL_LABELS[id]
  if (collapsed) {
    return <CollapsedStrip label={label} role={role} onExpand={() => onToggle(role, scenarioId, id)} />
  }
  return (
    <div className="workspace-slot-frame">
      <div className="workspace-panel-controls">
        <button type="button" title={`Collapse ${label}`} onClick={() => onToggle(role, scenarioId, id)}>Hide</button>
        <button type="button" title={`Fullscreen ${label}`} onClick={() => onFullscreen(role, scenarioId, id)}>Max</button>
      </div>
      {slot?.element}
    </div>
  )
}

function CollapsedStrip({ label, role, onExpand }) {
  return (
    <button type="button" className={`workspace-collapsed-strip workspace-collapsed-strip-${role}`} onClick={onExpand}>
      <span>&gt;</span>
      {label}
    </button>
  )
}

function ResizeHandle({ role, direction, hidden }) {
  if (hidden) return null
  return (
    <Separator
      className={`workspace-resize-handle workspace-resize-handle-${direction} workspace-resize-handle-${role}`}
      aria-label={`Resize ${direction} workspace panels`}
    />
  )
}
