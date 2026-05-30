/**
 * Minimal singleton toast bus.
 * Import toast anywhere and call toast.success('…') — no Provider needed.
 */
const listeners = new Set()
let _id = 0

function emit(type, message, opts = {}) {
  const entry = { id: ++_id, type, message, duration: opts.duration ?? 4000, ...opts }
  listeners.forEach((fn) => fn(entry))
  return entry.id
}

const toast = {
  success:     (msg, opts) => emit('success',     msg, opts),
  error:       (msg, opts) => emit('error',       msg, opts),
  warning:     (msg, opts) => emit('warning',     msg, opts),
  info:        (msg, opts) => emit('info',        msg, opts),
  achievement: (msg, opts) => emit('achievement', msg, { duration: 5000, ...opts }),
  score: (delta, reason, opts) => emit(
    delta >= 0 ? 'score-gain' : 'score-loss',
    `${delta > 0 ? '+' : ''}${delta} pts${reason ? ` — ${reason}` : ''}`,
    opts,
  ),
}

export default toast

export function subscribe(fn) {
  listeners.add(fn)
  return () => listeners.delete(fn)
}
