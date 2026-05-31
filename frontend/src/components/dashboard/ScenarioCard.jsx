import useTilt from '../../hooks/useTilt'
import useCursorIntent from '../../hooks/useCursorIntent'

const DIFFICULTY_TONE = {
  Beginner:     'badge-v3-green',
  Intermediate: 'badge-v3-amber',
  Advanced:     'badge-v3-red',
}

/**
 * ScenarioCard — 2.5D tilt + spotlight scenario tile for the dashboard.
 * Pure CSS perspective transform — no WebGL, free, 60fps.
 */
export default function ScenarioCard({
  scenario,
  summary,
  learnPoints = [],
  showLearnPoints = false,
  activeSessionId = null,
  onClick,
  onLaunch,
}) {
  const { bind } = useTilt({ maxTilt: 5, spotlight: true })
  const cursor = useCursorIntent({ intent: 'engage', label: 'ENGAGE', mode: 'red' })
  const diffCls = DIFFICULTY_TONE[scenario.difficulty] || DIFFICULTY_TONE.Intermediate
  const accentBg = 'var(--nb-accent-grad)'

  return (
    <div
      ref={bind.ref}
      onMouseMove={bind.onMouseMove}
      onMouseEnter={cursor.bind.onMouseEnter}
      onMouseLeave={() => { bind.onMouseLeave(); cursor.bind.onMouseLeave() }}
      role="button"
      tabIndex={0}
      onClick={onClick}
      onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') onClick?.() }}
      className="group relative cursor-pointer outline-none"
      style={{
        transformStyle: 'preserve-3d',
        perspective: '1000px',
      }}
    >
      <div
        className="relative overflow-hidden p-6 glass transition-all duration-200 group-hover:border-nb-border-strong"
        style={{
          transform: 'perspective(1000px) rotateX(var(--rx, 0deg)) rotateY(var(--ry, 0deg))',
          transformStyle: 'preserve-3d',
          transition: 'transform 220ms var(--ease-enter), border-color 150ms var(--ease-enter), box-shadow 150ms var(--ease-enter)',
          willChange: 'transform',
        }}
      >

        {/* Spotlight glow following cursor */}
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-enter ease-glide"
          style={{
            background: `radial-gradient(420px circle at var(--mx, 50%) var(--my, 50%), rgba(255,255,255,0.05), transparent 45%)`,
          }}
        />

        {/* ID + Difficulty row */}
        <div className="flex items-center justify-between mb-4 relative">
          <span className="font-mono text-[10.5px] tracking-[0.12em] uppercase text-txt-dim">
            {scenario.id}
          </span>
          <div className="flex items-center gap-1.5">
            {activeSessionId && (
              <span className="flex items-center gap-1 px-1.5 py-0.5 rounded-full border border-green-signal/40 bg-green-signal/10 text-[9px] font-mono font-bold text-green-signal uppercase tracking-wide">
                <span className="w-1 h-1 rounded-full bg-green-signal animate-pulse-soft" aria-hidden />
                RESUME
              </span>
            )}
            <span className={`badge-v3 ${diffCls}`}>
              {scenario.difficulty}
            </span>
          </div>
        </div>

        {/* Title */}
        <h3
          className="font-display font-extrabold text-txt-primary leading-tight mb-2"
          style={{ fontSize: '20px', transform: 'translateZ(20px)' }}
        >
          {scenario.title}
        </h3>

        {/* Summary */}
        <p className="text-[13px] leading-relaxed text-txt-secondary mb-5 line-clamp-3">
          {summary}
        </p>

        {/* Learn points (beginner only) */}
        {showLearnPoints && learnPoints.length > 0 && (
          <div className="mb-5 space-y-1.5">
            {learnPoints.slice(0, 3).map((l) => (
              <div key={l} className="flex items-center gap-2 text-[12px] text-txt-secondary font-mono">
                <span className="w-1 h-1 rounded-full bg-cs-blue flex-shrink-0" />
                <span>{l}</span>
              </div>
            ))}
          </div>
        )}

        {/* Frameworks */}
        {scenario.frameworks?.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mb-5">
            {scenario.frameworks.slice(0, 4).map((f) => (
              <span key={f} className="badge-v3 badge-v3-neutral font-mono text-[9px]">
                {f}
              </span>
            ))}
          </div>
        )}

        {/* CTA */}
        <button
          onClick={(e) => { e.stopPropagation(); (onLaunch || onClick)?.() }}
          className="btn-v3 btn-v3-blue btn-v3-sm w-full justify-center"
          style={{ transform: 'translateZ(30px)' }}
        >
          Open briefing
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
            <path d="M2 7h10m-4-4l4 4-4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </button>

        {/* Bottom accent bar */}
        <div
          aria-hidden
          className="absolute bottom-0 left-0 right-0 h-[2px]"
          style={{ background: accentBg }}
        />
      </div>
    </div>
  )
}
