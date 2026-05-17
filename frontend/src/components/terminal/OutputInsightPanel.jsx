export default function OutputInsightPanel({ insights, activeId, onSelect, onDismiss }) {
  if (!insights.length) return null

  const active = insights.find((item) => item.id === activeId) || insights[0]

  const copyNext = async () => {
    if (!active?.next) return
    try {
      await navigator.clipboard.writeText(active.next)
    } catch {
      // clipboard may be unavailable in insecure browser contexts
    }
  }

  return (
    <div className="output-insight-panel" aria-live="polite">
      <div className="output-insight-tabs">
        {insights.slice(0, 4).map((insight) => (
          <button
            key={insight.id}
            type="button"
            className={insight.id === active.id ? 'active' : ''}
            onClick={() => onSelect(insight.id)}
            title={insight.what}
          >
            {insight.tags?.[0] || 'output'}
          </button>
        ))}
      </div>
      <div className="output-insight-card">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-[10px] font-mono uppercase tracking-[0.12em] text-green-signal">Output insight</p>
            <h4>{active.what}</h4>
          </div>
          <button type="button" className="output-insight-close" onClick={() => onDismiss(active.id)}>Close</button>
        </div>
        <p>{active.why}</p>
        {active.matched_line && <code>{active.matched_line}</code>}
        <div className="output-insight-next">
          <span>{active.next}</span>
          <button type="button" onClick={copyNext}>Copy</button>
        </div>
      </div>
    </div>
  )
}
