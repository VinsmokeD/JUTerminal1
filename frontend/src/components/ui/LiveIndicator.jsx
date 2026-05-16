export default function LiveIndicator({ label = 'Live', className = '' }) {
  return <span className={`live-indicator ${className}`}>{label}</span>
}
