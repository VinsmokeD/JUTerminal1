import { useEffect, useMemo, useRef, useState, useCallback } from 'react'
import { createPortal } from 'react-dom'
import { useNavigate } from 'react-router-dom'
import { useAuthStore } from '../../store/authStore'

/**
 * CommandPalette — global ⌘K (Ctrl+K) command launcher.
 *
 * Behaviour:
 *   - ⌘K / Ctrl+K toggles the palette globally
 *   - / focuses the search when palette is open
 *   - Arrow keys navigate items; Enter executes; Escape closes
 *   - Items have a `where` (route or function) and `tone` for the leading icon
 *
 * Performance: portal-mounted, render-on-demand, list virtualization not
 * needed (≤20 items). Single keydown listener on window.
 */

const ITEM_TONE = {
  red:    { bg: 'bg-cs-red/8',       text: 'text-cs-red'       },
  blue:   { bg: 'bg-cs-blue/8',      text: 'text-cs-blue'      },
  green:  { bg: 'bg-green-signal/8', text: 'text-green-signal' },
  amber:  { bg: 'bg-amber-warn/8',   text: 'text-amber-warn'   },
  neutral:{ bg: 'bg-surface-3',      text: 'text-txt-secondary' },
}

const TIP_ITEMS = [
  { id: 'home',        section: 'Navigate', label: 'Landing page',      hint: 'Public marketing site',          tone: 'neutral', kbd: 'G H', to: '/' },
  { id: 'dashboard',   section: 'Navigate', label: 'Dashboard',          hint: 'Choose a scenario to launch',    tone: 'blue',    kbd: 'G D', to: '/dashboard' },
  { id: 'onboard',     section: 'Navigate', label: 'Onboarding',         hint: 'Walkthrough for new operators',  tone: 'amber',   to: '/onboarding' },
  { id: 'sc01',        section: 'Scenarios', label: 'SC-01 — NovaMed Healthcare', hint: 'Web app pentest (OWASP)',  tone: 'red',  kbd: '1', scenarioId: 'SC-01' },
  { id: 'sc02',        section: 'Scenarios', label: 'SC-02 — Nexora Financial',   hint: 'Active Directory (Kerberoasting)', tone: 'red', kbd: '2', scenarioId: 'SC-02' },
  { id: 'sc03',        section: 'Scenarios', label: 'SC-03 — Orion Logistics',    hint: 'Phishing campaign (GoPhish)', tone: 'red', kbd: '3', scenarioId: 'SC-03' },
  { id: 'logout',      section: 'Account',  label: 'Sign out',           hint: 'End your CyberSim session',       tone: 'neutral', action: 'logout' },
]

export default function CommandPalette() {
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [cursor, setCursor] = useState(0)
  const inputRef = useRef(null)
  const listRef = useRef(null)
  const navigate = useNavigate()
  const { logout } = useAuthStore()

  // ── Global ⌘K / Ctrl+K trigger ────────────────────────────────
  useEffect(() => {
    const onKey = (e) => {
      const mod = e.metaKey || e.ctrlKey
      if (mod && (e.key === 'k' || e.key === 'K')) {
        e.preventDefault()
        setOpen((p) => !p)
        setQuery('')
        setCursor(0)
        return
      }
      if (e.key === 'Escape' && open) {
        e.preventDefault()
        setOpen(false)
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open])

  // ── Lock scroll when open + focus search ──────────────────────
  useEffect(() => {
    if (!open) return
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    setTimeout(() => inputRef.current?.focus(), 30)
    return () => { document.body.style.overflow = prev }
  }, [open])

  const runItem = useCallback((item) => {
    setOpen(false)
    if (item.action === 'logout') {
      logout()
      navigate('/auth')
      return
    }
    if (item.scenarioId) {
      navigate('/dashboard', { state: { scenarioId: item.scenarioId } })
      return
    }
    if (item.to) navigate(item.to)
  }, [navigate, logout])

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return TIP_ITEMS
    return TIP_ITEMS.filter((i) =>
      i.label.toLowerCase().includes(q) ||
      i.hint?.toLowerCase().includes(q) ||
      i.section?.toLowerCase().includes(q),
    )
  }, [query])

  // Group by section in render order
  const grouped = useMemo(() => {
    const out = []
    const seen = new Map()
    for (const item of filtered) {
      if (!seen.has(item.section)) {
        seen.set(item.section, out.length)
        out.push({ section: item.section, items: [] })
      }
      out[seen.get(item.section)].items.push(item)
    }
    return out
  }, [filtered])

  // Flat index for keyboard navigation
  const flat = useMemo(() => filtered, [filtered])

  useEffect(() => { setCursor(0) }, [query])

  const onListKey = useCallback((e) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setCursor((c) => Math.min(flat.length - 1, c + 1))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setCursor((c) => Math.max(0, c - 1))
    } else if (e.key === 'Enter' && flat[cursor]) {
      e.preventDefault()
      runItem(flat[cursor])
    }
  }, [flat, cursor, runItem])

  if (!open) return null

  return createPortal(
    <>
      <div className="modal-v3-scrim" onClick={() => setOpen(false)} />
      <div className="modal-v3-container" style={{ alignItems: 'flex-start', paddingTop: '12vh' }}>
        <div
          className="modal-v3-panel"
          style={{ maxWidth: 640, maxHeight: '70vh', display: 'flex', flexDirection: 'column' }}
          role="dialog"
          aria-modal="true"
          aria-label="Command palette"
          onKeyDown={onListKey}
        >
          {/* Search bar */}
          <div className="flex items-center gap-3 px-4 py-3 border-b border-cs-border">
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none" className="text-txt-dim flex-shrink-0">
              <circle cx="7" cy="7" r="5" stroke="currentColor" strokeWidth="1.5" />
              <path d="M11 11l3 3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
            </svg>
            <input
              ref={inputRef}
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search routes, scenarios, actions…"
              className="flex-1 bg-transparent outline-none text-txt-primary text-sm font-display placeholder:text-txt-dim"
            />
            <kbd className="font-mono text-[10.5px] text-txt-dim border border-cs-border rounded px-1.5 py-0.5">ESC</kbd>
          </div>

          {/* Results */}
          <div ref={listRef} className="flex-1 overflow-y-auto py-2">
            {grouped.length === 0 ? (
              <div className="px-4 py-8 text-center text-txt-dim text-sm font-mono">
                No matches for “{query}”
              </div>
            ) : grouped.map((g) => (
              <div key={g.section} className="py-1.5">
                <div className="px-4 py-1 text-[10.5px] font-mono uppercase tracking-[0.12em] text-txt-dim">
                  {g.section}
                </div>
                {g.items.map((item) => {
                  const isActive = flat.indexOf(item) === cursor
                  const tone = ITEM_TONE[item.tone] || ITEM_TONE.neutral
                  return (
                    <button
                      key={item.id}
                      onClick={() => runItem(item)}
                      onMouseEnter={() => setCursor(flat.indexOf(item))}
                      className={`w-full flex items-center gap-3 px-4 py-2.5 text-left transition-colors ${
                        isActive ? 'bg-surface-3' : 'hover:bg-surface-2'
                      }`}
                    >
                      <span className={`w-7 h-7 rounded-cs-sm flex items-center justify-center font-mono text-[11px] font-bold flex-shrink-0 ${tone.bg} ${tone.text}`}>
                        {item.label[0]}
                      </span>
                      <div className="min-w-0 flex-1">
                        <div className="text-sm text-txt-primary truncate">{item.label}</div>
                        {item.hint && <div className="text-[11px] text-txt-dim truncate font-mono">{item.hint}</div>}
                      </div>
                      {item.kbd && (
                        <kbd className="font-mono text-[10.5px] text-txt-dim border border-cs-border rounded px-1.5 py-0.5 flex-shrink-0">
                          {item.kbd}
                        </kbd>
                      )}
                    </button>
                  )
                })}
              </div>
            ))}
          </div>

          {/* Footer hint */}
          <div className="flex items-center justify-between px-4 py-2.5 border-t border-cs-border text-[10.5px] font-mono text-txt-dim">
            <span className="flex items-center gap-2">
              <kbd className="border border-cs-border rounded px-1 py-px">↑</kbd>
              <kbd className="border border-cs-border rounded px-1 py-px">↓</kbd>
              Navigate
            </span>
            <span className="flex items-center gap-2">
              <kbd className="border border-cs-border rounded px-1.5 py-px">↵</kbd>
              Open
            </span>
            <span className="flex items-center gap-2">
              <kbd className="border border-cs-border rounded px-1 py-px">⌘</kbd>
              <kbd className="border border-cs-border rounded px-1 py-px">K</kbd>
              Toggle
            </span>
          </div>
        </div>
      </div>
    </>,
    document.body,
  )
}
