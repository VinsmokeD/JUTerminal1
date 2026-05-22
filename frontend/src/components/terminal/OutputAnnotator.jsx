export default function OutputAnnotator({ insight, onDismiss }) {
  if (!insight) return null

  return (
    <div className="output-annotator">
      <span className="output-annotator-dot" />
      <span className="truncate">{insight.what}</span>
      <span className="output-annotator-target">Tutor</span>
      <button type="button" className="output-annotator-dismiss" onClick={onDismiss} aria-label="Dismiss insight">
        Close
      </button>
    </div>
  )
}
