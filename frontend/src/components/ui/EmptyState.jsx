export default function EmptyState({ icon, title, body, action, className = '' }) {
  return (
    <div className={`empty-v3 ${className}`}>
      {icon && <div className="empty-v3-icon">{icon}</div>}
      {title && <div className="empty-v3-title">{title}</div>}
      {body && <div className="empty-v3-body">{body}</div>}
      {action && <div className="pt-2">{action}</div>}
    </div>
  )
}
