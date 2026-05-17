export default function OutputAnnotator({ insight, onOpen }) {
  if (!insight) return null

  return (
    <button type="button" className="output-annotator" onClick={onOpen}>
      <span className="output-annotator-dot" />
      <span className="truncate">{insight.what}</span>
    </button>
  )
}
