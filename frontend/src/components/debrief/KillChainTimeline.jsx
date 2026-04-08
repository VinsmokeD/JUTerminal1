import React from 'react'

function formatTime(value) {
  try {
    return new Date(value).toLocaleTimeString()
  } catch {
    return value
  }
}

function teamStyles(team) {
  if (team === 'red') {
    return {
      dot: 'bg-red-500 border-red-300',
      branch: 'bg-red-500/80',
      card: 'border-red-900/70 bg-red-950/30',
      badge: 'text-red-300 bg-red-950/60 border-red-800/60',
      text: 'text-red-200',
    }
  }
  return {
    dot: 'bg-blue-500 border-blue-300',
    branch: 'bg-blue-500/80',
    card: 'border-blue-900/70 bg-blue-950/30',
    badge: 'text-blue-300 bg-blue-950/60 border-blue-800/60',
    text: 'text-blue-200',
  }
}

export default function KillChainTimeline({ events = [] }) {
  if (!Array.isArray(events) || events.length === 0) {
    return (
      <div className="rounded-lg border border-gray-700 bg-gray-900 p-5 text-sm text-gray-400">
        No kill-chain events available yet.
      </div>
    )
  }

  return (
    <section className="rounded-lg border border-gray-700 bg-gray-900 p-5">
      <div className="mb-5 flex items-center justify-between">
        <h2 className="text-sm font-semibold uppercase tracking-wider text-gray-200">Kill Chain Timeline</h2>
        <div className="flex items-center gap-3 text-[11px] text-gray-400">
          <span className="inline-flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-red-500" />Red Team</span>
          <span className="inline-flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-blue-500" />Blue Team</span>
        </div>
      </div>

      <div className="relative">
        <div className="absolute left-1/2 top-0 h-full w-px -translate-x-1/2 bg-gradient-to-b from-gray-600 via-gray-500 to-gray-700" />

        <div className="space-y-4">
          {events.map((event, index) => {
            const isRed = event.team === 'red'
            const styles = teamStyles(isRed ? 'red' : 'blue')

            return (
              <div
                key={`${event.timestamp}-${event.title}-${index}`}
                className={`relative grid grid-cols-[1fr_24px_1fr] items-center gap-4 ${isRed ? '' : '[&>div:first-child]:order-3 [&>div:last-child]:order-1'}`}
              >
                <div className="h-px" />

                <div className="relative mx-auto flex h-6 w-6 items-center justify-center">
                  <span className={`h-3 w-3 rounded-full border ${styles.dot}`} />
                </div>

                <article className={`relative rounded-md border p-3 ${styles.card}`}>
                  <span className={`mb-2 inline-flex rounded border px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide ${styles.badge}`}>
                    {isRed ? 'Red Team' : 'Blue Team'}
                  </span>
                  <h3 className={`text-sm font-semibold ${styles.text}`}>{event.title}</h3>
                  <p className="mt-1 text-xs text-gray-300">{event.description}</p>
                  <p className="mt-2 text-[11px] text-gray-500">{formatTime(event.timestamp)}</p>

                  <span
                    className={`absolute top-1/2 h-px w-4 -translate-y-1/2 ${styles.branch} ${
                      isRed ? '-right-4' : '-left-4'
                    }`}
                  />
                </article>
              </div>
            )
          })}
        </div>
      </div>
    </section>
  )
}
