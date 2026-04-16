import { useRef, useEffect } from 'react'

/**
 * ParticleCanvas — Red/Blue network topology background
 * Pure Canvas API, ~60 lines core logic, no dependencies.
 * Red and blue nodes with team-colored connections.
 * Mouse proximity glow interaction.
 */
export default function ParticleCanvas({ className = '' }) {
  const canvasRef = useRef(null)
  const mouseRef = useRef({ x: -1000, y: -1000 })
  const nodesRef = useRef([])

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    let animId

    function resize() {
      const dpr = window.devicePixelRatio || 1
      const rect = canvas.getBoundingClientRect()
      canvas.width = rect.width * dpr
      canvas.height = rect.height * dpr
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
      initNodes(rect.width, rect.height)
    }

    function initNodes(cw, ch) {
      const count = Math.floor((cw * ch) / 20000)
      nodesRef.current = Array.from({ length: count }, () => ({
        x: Math.random() * cw,
        y: Math.random() * ch,
        vx: (Math.random() - 0.5) * 0.3,
        vy: (Math.random() - 0.5) * 0.3,
        r: Math.random() * 1.5 + 0.5,
        team: Math.random() > 0.5 ? 'red' : 'blue',
      }))
    }

    function draw() {
      const rect = canvas.getBoundingClientRect()
      const cw = rect.width
      const ch = rect.height
      const nodes = nodesRef.current
      const mouse = mouseRef.current

      ctx.clearRect(0, 0, cw, ch)

      // Update positions
      nodes.forEach(n => {
        n.x += n.vx
        n.y += n.vy
        if (n.x < 0 || n.x > cw) n.vx *= -1
        if (n.y < 0 || n.y > ch) n.vy *= -1
      })

      // Draw connections
      const maxDist = 120
      for (let i = 0; i < nodes.length; i++) {
        for (let j = i + 1; j < nodes.length; j++) {
          const dx = nodes[i].x - nodes[j].x
          const dy = nodes[i].y - nodes[j].y
          const dist = Math.sqrt(dx * dx + dy * dy)
          if (dist < maxDist) {
            const alpha = (1 - dist / maxDist) * 0.12
            if (nodes[i].team === nodes[j].team) {
              ctx.strokeStyle = nodes[i].team === 'red'
                ? `rgba(255,59,59,${alpha})`
                : `rgba(59,139,255,${alpha})`
            } else {
              ctx.strokeStyle = `rgba(140,140,180,${alpha * 0.5})`
            }
            ctx.lineWidth = 0.5
            ctx.beginPath()
            ctx.moveTo(nodes[i].x, nodes[i].y)
            ctx.lineTo(nodes[j].x, nodes[j].y)
            ctx.stroke()
          }
        }
      }

      // Draw nodes
      nodes.forEach(n => {
        const dx = n.x - mouse.x
        const dy = n.y - mouse.y
        const dist = Math.sqrt(dx * dx + dy * dy)
        const glow = dist < 150 ? (1 - dist / 150) * 0.6 : 0
        const color = n.team === 'red' ? [255, 59, 59] : [59, 139, 255]
        const a = 0.3 + glow

        if (glow > 0) {
          ctx.beginPath()
          ctx.arc(n.x, n.y, n.r + 4, 0, Math.PI * 2)
          ctx.fillStyle = `rgba(${color[0]},${color[1]},${color[2]},${glow * 0.15})`
          ctx.fill()
        }

        ctx.beginPath()
        ctx.arc(n.x, n.y, n.r, 0, Math.PI * 2)
        ctx.fillStyle = `rgba(${color[0]},${color[1]},${color[2]},${a})`
        ctx.fill()
      })

      animId = requestAnimationFrame(draw)
    }

    const handleMove = (e) => {
      const rect = canvas.getBoundingClientRect()
      mouseRef.current = { x: e.clientX - rect.left, y: e.clientY - rect.top }
    }
    const handleLeave = () => {
      mouseRef.current = { x: -1000, y: -1000 }
    }

    canvas.addEventListener('mousemove', handleMove)
    canvas.addEventListener('mouseleave', handleLeave)
    window.addEventListener('resize', resize)

    resize()
    draw()

    return () => {
      cancelAnimationFrame(animId)
      canvas.removeEventListener('mousemove', handleMove)
      canvas.removeEventListener('mouseleave', handleLeave)
      window.removeEventListener('resize', resize)
    }
  }, [])

  return (
    <canvas
      ref={canvasRef}
      className={`absolute inset-0 w-full h-full ${className}`}
      style={{ zIndex: 0 }}
    />
  )
}
