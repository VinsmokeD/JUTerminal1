export default function SectionHeading({ eyebrow, title, body, align = 'left', className = '' }) {
  return (
    <div className={`flex flex-col gap-3 ${align === 'center' ? 'items-center text-center' : ''} ${className}`}>
      {eyebrow && <span className="section-eyebrow">{eyebrow}</span>}
      {title && <h2 className="font-display text-display-3 text-txt-primary">{title}</h2>}
      {body && <p className="text-body-1 text-txt-secondary max-w-[640px] leading-relaxed">{body}</p>}
    </div>
  )
}
