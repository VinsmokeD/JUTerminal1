import { useRef, useEffect } from 'react'
import { useSessionStore } from '../../store/sessionStore'

const SEVERITY_STYLE = {
  CRITICAL: 'text-red-400 bg-red-950 border-red-800',
  HIGH: 'text-orange-400 bg-orange-950 border-orange-800',
  MED: 'text-yellow-400 bg-yellow-950 border-yellow-800',
  INFO: 'text-blue-400 bg-blue-950 border-blue-800',
}

export default function SiemFeed() {
  const events = useSessionStore((s) => s.siemEvents)
  const bottomRef = useRef(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [events.length])

  if (events.length === 0) {
    return (
      <div className="h-full flex items-center justify-center">
        <p className="text-gray-700 text-xs font-mono">Waiting for events...</p>
      </div>
    )
  }

  return (
    <div className="h-full overflow-y-auto font-mono text-xs p-2 space-y-px">
      {[...events].reverse().map((ev) => (
        <EventRow key={ev.id} event={ev} />
      ))}
      <div ref={bottomRef} />
    </div>
  )
}

function EventRow({ event }) {
  const style = SEVERITY_STYLE[event.severity] || SEVERITY_STYLE.INFO
  const ts = new Date(event.timestamp || event.created_at).toLocaleTimeString()

  return (
    <div className={`flex items-start gap-2 px-2 py-1.5 rounded border ${style} border-opacity-30`}>
      <span className={`flex-shrink-0 text-xs font-bold px-1.5 py-px rounded border ${style} text-opacity-100`}>
        {event.severity}
      </span>
      <span className="text-gray-500 flex-shrink-0">{ts}</span>
      <span className="flex-1 text-gray-200 leading-relaxed">{event.message}</span>
      {event.mitre_technique && (
        <span className="flex-shrink-0 text-purple-400 bg-purple-950 border border-purple-800 px-1.5 py-px rounded text-xs">
          {event.mitre_technique}
        </span>
      )}
    </div>
  )
}
