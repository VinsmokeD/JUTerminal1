import useTilt from '../../hooks/useTilt'

const ACCENT_BAR = {
  'SC-01': 'linear-gradient(90deg, #ff3b3b, #ffaa00)',
  'SC-02': 'linear-gradient(90deg, #ffaa00, #ff3b3b)',
  'SC-03': 'linear-gradient(90deg, #3b8bff, #ff2244)',
}

const DIFFICULTY_TONE = {
  Beginner:     'text-green-signal border-green-signal/30 bg-green-signal/8',
  Intermediate: 'text-amber-warn   border-amber-warn/30   bg-amber-warn/8',
  Advanced:     'text-cs-red       border-cs-red/30       bg-cs-red/8',
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
  onClick,
  onLaunch,
}) {
  const { bind } = useTilt({ maxTilt: 5, spotlight: true })
  const diffCls = DIFFICULTY_TONE[scenario.difficulty] || DIFFICULTY_TONE.Intermediate
  const accentBg = ACCENT_BAR[scenario.id] || ACCENT_BAR['SC-01']

  return (
    <div
      {...bind}
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
        className="
          relative overflow-hidden p-6 rounded-cs-lg
          bg-surface-1 border border-cs-border
          shadow-z-1 transition-all duration-enter ease-enter
          group-hover:border-cs-border-glow group-hover:shadow-z-2
        "
        style={{
          transform: 'perspective(1000px) rotateX(var(--rx, 0deg)) rotateY(var(--ry, 0deg))',
          transformStyle: 'preserve-3d',
          transition: 'transform 220ms cubic-bezier(0.16,1,0.3,1), border-color 280ms, box-shadow 280ms',
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
          <span className={`px-2 py-0.5 rounded-full font-mono text-[10px] uppercase tracking-wider border ${diffCls}`}>
            {scenario.difficulty}
          </span>
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
              <div key={l} className="flex items-center gap-2 text-[12px] text-txt-secondary">
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
              <span key={f} className="px-2 py-0.5 rounded-full font-mono text-[10px] border border-cs-border text-txt-dim">
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
