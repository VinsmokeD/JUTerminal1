export default function Divider({ label, className = '' }) {
  if (!label) {
    return <div className={`h-px bg-cs-border ${className}`} />
  }
  return <div className={`divider-v3 ${className}`}>{label}</div>
}
