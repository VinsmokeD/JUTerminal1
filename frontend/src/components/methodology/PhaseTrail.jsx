const PHASES = {
  ptes: ['Pre-Engagement', 'Intel Gathering', 'Threat Modeling', 'Exploitation', 'Post-Exploit', 'Reporting'],
  owasp: ['Planning', 'Recon', 'Mapping', 'Discovery', 'Exploitation', 'Reporting'],
  issaf: ['Planning', 'Assessment', 'Reporting', 'Cleanup', '', ''],
  nist: ['Identify', 'Detect', 'Contain', 'Eradicate', 'Recover', 'Post-IR'],
  custom: ['Phase 1', 'Phase 2', 'Phase 3', 'Phase 4', 'Phase 5', 'Phase 6'],
}

export default function PhaseTrail({ methodology = 'ptes', role = 'red', currentPhase = 1 }) {
  const key = role === 'blue' ? 'nist' : (methodology || 'ptes')
  const phases = PHASES[key] || PHASES.ptes

  return (
    <div className="flex items-center gap-0.5 overflow-hidden">
      {phases.filter(Boolean).map((label, i) => {
        const num = i + 1
        const done = num < currentPhase
        const active = num === currentPhase
        return (
          <div key={num} className="flex items-center gap-0.5 min-w-0">
            <div
              title={label}
              className={`flex items-center justify-center w-5 h-5 rounded-full text-xs font-mono flex-shrink-0 border transition-all duration-200 ${
                active
                  ? role === 'red'
                    ? 'bg-cs-red/20 border-cs-red text-cs-red'
                    : 'bg-cs-blue/20 border-cs-blue text-cs-blue'
                  : done
                  ? 'bg-surface-3 border-cs-border-glow text-txt-dim'
                  : 'bg-transparent border-cs-border text-txt-dim/40'
              }`}
            >
              {done ? (
                <svg className="w-2.5 h-2.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                </svg>
              ) : num}
            </div>
            {i < phases.filter(Boolean).length - 1 && (
              <div className={`h-px w-4 flex-shrink-0 transition-colors duration-200 ${
                done
                  ? role === 'red' ? 'bg-cs-red/30' : 'bg-cs-blue/30'
                  : 'bg-cs-border'
              }`} />
            )}
          </div>
        )
      })}
      <span className={`text-xs ml-2 truncate hidden sm:block font-mono ${
        role === 'red' ? 'text-cs-red/70' : 'text-cs-blue/70'
      }`}>
        {phases[currentPhase - 1] || ''}
      </span>
    </div>
  )
}
