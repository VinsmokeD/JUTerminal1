// Shared Parallax logo primitives — single source of truth for the dual-square
// mark + the Orbitron wordmark. Tone-aware (color / mono-light / mono-dark).

const RED = '#FF6B7A'
const BLUE = '#4CC2FF'
const VIOLET = '#9B7DFF'
const NAVY = '#0A0E17'
const WHITE = '#F0F4FF'

export function ParallaxMark({ size = 96, tone = 'color' }) {
  const sq = 60
  const offset = 24
  const x1 = 8
  const y1 = 8
  const x2 = x1 + offset
  const y2 = y1 + offset

  const redFill = tone === 'color' ? RED : tone === 'mono-light' ? WHITE : NAVY
  const blueFill = tone === 'color' ? BLUE : tone === 'mono-light' ? WHITE : NAVY
  const overlapFill = tone === 'color' ? VIOLET : tone === 'mono-light' ? WHITE : NAVY

  const overlapX = x2
  const overlapY = y2
  const overlapW = x1 + sq - x2
  const overlapH = y1 + sq - y2

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 100 100"
      xmlns="http://www.w3.org/2000/svg"
      style={{ display: 'block' }}
    >
      <defs>
        <filter id="pxGlowRed" x="-30%" y="-30%" width="160%" height="160%">
          <feGaussianBlur stdDeviation="2.2" result="b" />
          <feMerge>
            <feMergeNode in="b" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
        <filter id="pxGlowBlue" x="-30%" y="-30%" width="160%" height="160%">
          <feGaussianBlur stdDeviation="2.2" result="b" />
          <feMerge>
            <feMergeNode in="b" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>

      <rect
        x={x1}
        y={y1}
        width={sq}
        height={sq}
        fill={redFill}
        opacity={tone === 'color' ? 0.95 : 1}
        filter={tone === 'color' ? 'url(#pxGlowRed)' : undefined}
      />
      <rect
        x={x2}
        y={y2}
        width={sq}
        height={sq}
        fill={blueFill}
        opacity={tone === 'color' ? 0.95 : 1}
        filter={tone === 'color' ? 'url(#pxGlowBlue)' : undefined}
      />
      {tone === 'color' && (
        <rect x={overlapX} y={overlapY} width={overlapW} height={overlapH} fill={overlapFill} />
      )}
    </svg>
  )
}

export function ParallaxWordmark({ size = 32, tone = 'color', bg = 'dark' }) {
  const baseColor =
    tone === 'color' ? (bg === 'dark' ? WHITE : NAVY) : tone === 'mono-light' ? WHITE : NAVY

  const firstA = tone === 'color' ? RED : baseColor
  const secondA = tone === 'color' ? BLUE : baseColor

  const letterStyle = {
    fontFamily: "'Orbitron', sans-serif",
    fontWeight: 800,
    fontSize: size,
    letterSpacing: '0.15em',
    lineHeight: 1,
    color: baseColor,
    display: 'inline-flex',
  }

  return (
    <span style={letterStyle}>
      <span>P</span>
      <span style={{ color: firstA }}>A</span>
      <span>R</span>
      <span>A</span>
      <span>LL</span>
      <span style={{ color: secondA }}>A</span>
      <span>X</span>
    </span>
  )
}

export default ParallaxMark
