/**
 * Skeleton placeholders — two visual modes:
 *   pulse   (default) — subtle opacity pulse, cheap, always-on
 *   shimmer — gradient sweep, richer, auto-disabled at data-perf=low via CSS
 *
 * Usage:
 *   <Skeleton className="h-10 w-full" />
 *   <Skeleton shimmer className="h-5 w-48" />
 *   <SkeletonCard />  <SkeletonTextLine />  <SkeletonStat />  <SkeletonCode rows={4} />
 */
export function Skeleton({ className = '', shimmer = false }) {
  return (
    <div
      className={`rounded ${shimmer ? 'skeleton-shimmer' : 'animate-pulse bg-surface-2'} ${className}`}
      aria-hidden="true"
    />
  )
}

export function SkeletonCard({ className = '' }) {
  return (
    <div className={`rounded-lg border border-cs-border bg-surface-1 p-4 space-y-3 ${className}`} aria-hidden="true">
      <Skeleton shimmer className="h-5 w-2/3" />
      <Skeleton shimmer className="h-3 w-full" />
      <Skeleton shimmer className="h-3 w-4/5" />
      <div className="flex gap-2 pt-1">
        <Skeleton shimmer className="h-6 w-16 rounded-full" />
        <Skeleton shimmer className="h-6 w-20 rounded-full" />
      </div>
    </div>
  )
}

export function SkeletonTable({ rows = 5, cols = 4, className = '' }) {
  return (
    <div className={`space-y-2 ${className}`} aria-hidden="true">
      <div className="flex gap-3 pb-1 border-b border-cs-border">
        {Array.from({ length: cols }).map((_, i) => (
          <Skeleton key={i} shimmer className="h-4 flex-1" />
        ))}
      </div>
      {Array.from({ length: rows }).map((_, r) => (
        <div key={r} className="flex gap-3 items-center">
          {Array.from({ length: cols }).map((_, c) => (
            <Skeleton key={c} shimmer className="h-4 flex-1" />
          ))}
        </div>
      ))}
    </div>
  )
}

/** Single line of body text — reserves exact height to prevent CLS */
export function SkeletonTextLine({ width = 'w-full', className = '' }) {
  return <Skeleton shimmer className={`h-[14px] ${width} ${className}`} />
}

/** Stat tile — number + label */
export function SkeletonStat({ className = '' }) {
  return (
    <div className={`space-y-1.5 ${className}`} aria-hidden="true">
      <Skeleton shimmer className="h-8 w-20" />
      <Skeleton shimmer className="h-3 w-28" />
    </div>
  )
}

/** Code block / terminal output */
export function SkeletonCode({ rows = 5, className = '' }) {
  const widths = ['w-full', 'w-4/5', 'w-3/5', 'w-full', 'w-2/3']
  return (
    <div className={`space-y-2 font-mono ${className}`} aria-hidden="true">
      {Array.from({ length: rows }).map((_, i) => (
        <Skeleton key={i} shimmer className={`h-[13px] ${widths[i % widths.length]}`} />
      ))}
    </div>
  )
}
