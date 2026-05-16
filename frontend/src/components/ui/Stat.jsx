export default function Stat({ label, value, trend, accent, className = '' }) {
  const accentClr = {
    red: 'text-cs-red',
    blue: 'text-cs-blue',
    green: 'text-green-signal',
    amber: 'text-amber-warn',
  }[accent]
  return (
    <div className={`stat-v3 ${className}`}>
      <div className="stat-v3-label">{label}</div>
      <div className={`stat-v3-value ${accentClr || ''}`}>{value}</div>
      {trend && <div className="stat-v3-trend">{trend}</div>}
    </div>
  )
}
