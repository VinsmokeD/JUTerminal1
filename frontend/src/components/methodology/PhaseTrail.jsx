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
              className={`flex items-center justify-center w-5 h-5 rounded-full text-xs font-mono flex-shrink-0 border transition-colors ${
                active
                  ? 'bg-blue-600 border-blue-400 text-white'
                  : done
                  ? 'bg-gray-700 border-gray-600 text-gray-400'
                  : 'bg-transparent border-gray-700 text-gray-600'
              }`}
            >
              {done ? '✓' : num}
            </div>
            {i < phases.filter(Boolean).length - 1 && (
              <div className={`h-px w-4 flex-shrink-0 ${done ? 'bg-gray-600' : 'bg-gray-800'}`} />
            )}
          </div>
        )
      })}
      <span className="text-gray-500 text-xs ml-2 truncate hidden sm:block">
        {phases[currentPhase - 1] || ''}
      </span>
    </div>
  )
}
