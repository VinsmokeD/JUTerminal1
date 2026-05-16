const TONE = {
  red:     'badge-v3-red',
  blue:    'badge-v3-blue',
  green:   'badge-v3-green',
  amber:   'badge-v3-amber',
  neutral: 'badge-v3-neutral',
}

const SEVERITY_TO_TONE = {
  CRITICAL: 'red',
  HIGH:     'red',
  MEDIUM:   'amber',
  MED:      'amber',
  LOW:      'blue',
  INFO:     'neutral',
}

export default function Badge({ tone = 'neutral', severity, dot = false, className = '', children }) {
  const t = severity ? (SEVERITY_TO_TONE[severity] || 'neutral') : tone
  return (
    <span className={`badge-v3 ${TONE[t]} ${className}`}>
      {dot && <span className="inline-block w-1.5 h-1.5 rounded-full bg-current" />}
      {children ?? severity}
    </span>
  )
}
