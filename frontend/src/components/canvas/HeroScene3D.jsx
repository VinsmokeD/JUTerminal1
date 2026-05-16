import { useEffect, useRef } from 'react'
import * as THREE from 'three'
import { usePerfTier } from '../ui/PerfTier'

/**
 * HeroScene3D — WebGL particle network for the Landing hero.
 *
 * Design intent: Two interconnected meshes representing the Red and Blue
 * teams. Their nodes drift, connect to nearby teammates, and occasionally
 * fire a bright trace between teams (the "attack moment"). Mouse drag rotates
 * the camera around the formation.
 *
 * Performance budget per tier:
 *   tier 3 — 1400 particles, postFX-free, additive blending
 *   tier 2 —  900 particles, no trace flicker
 *   tier 1 —  500 particles, 30fps cap, no inter-team lines
 *   tier 0 — static SVG fallback (never instantiated)
 *
 * The component is **lazy-loaded** by Landing.jsx via React.lazy, so three.js
 * never enters the workspace bundle.
 */

const TIER_PROFILE = {
  3: { count: 1400, connectDist: 14, attackInterval: 4200, fpsCap: 0 },
  2: { count:  900, connectDist: 12, attackInterval: 5600, fpsCap: 0 },
  1: { count:  500, connectDist: 10, attackInterval: 0,    fpsCap: 30 },
}

export default function HeroScene3D({ className = '' }) {
  const containerRef = useRef(null)
  const tier = usePerfTier()

  useEffect(() => {
    const container = containerRef.current
    if (!container || tier <= 0) return
    const profile = TIER_PROFILE[tier] || TIER_PROFILE[2]

    // ── Scene setup ─────────────────────────────────────────────
    const scene = new THREE.Scene()
    scene.fog = new THREE.FogExp2(0x08090c, 0.012)

    const camera = new THREE.PerspectiveCamera(60, 1, 0.1, 200)
    camera.position.set(0, 0, 60)

    const renderer = new THREE.WebGLRenderer({
      antialias: tier === 3,
      alpha: true,
      powerPreference: 'high-performance',
    })
    renderer.setClearColor(0x000000, 0)
    const dpr = Math.min(window.devicePixelRatio || 1, tier === 3 ? 2 : 1.5)
    renderer.setPixelRatio(dpr)
    container.appendChild(renderer.domElement)

    const resize = () => {
      const { clientWidth: w, clientHeight: h } = container
      renderer.setSize(w, h, false)
      camera.aspect = w / h
      camera.updateProjectionMatrix()
    }
    resize()

    // ── Particle positions / colours ─────────────────────────────
    const N = profile.count
    const positions = new Float32Array(N * 3)
    const colors = new Float32Array(N * 3)
    const teamArr = new Uint8Array(N)
    const speeds = new Float32Array(N * 3)

    const RADIUS = 36
    for (let i = 0; i < N; i++) {
      const team = Math.random() > 0.5 ? 0 : 1 // 0 = red, 1 = blue
      teamArr[i] = team
      // Two interleaved formations, slightly offset on X
      const offX = team === 0 ? -8 : 8
      const r = RADIUS * Math.cbrt(Math.random())
      const t = Math.random() * Math.PI * 2
      const p = Math.acos(2 * Math.random() - 1)
      positions[i * 3]     = offX + r * Math.sin(p) * Math.cos(t)
      positions[i * 3 + 1] =        r * Math.sin(p) * Math.sin(t)
      positions[i * 3 + 2] =        r * Math.cos(p)
      speeds[i * 3]     = (Math.random() - 0.5) * 0.04
      speeds[i * 3 + 1] = (Math.random() - 0.5) * 0.04
      speeds[i * 3 + 2] = (Math.random() - 0.5) * 0.04

      if (team === 0) { // red
        colors[i * 3]     = 1.0
        colors[i * 3 + 1] = 0.23
        colors[i * 3 + 2] = 0.23
      } else {           // blue
        colors[i * 3]     = 0.23
        colors[i * 3 + 1] = 0.55
        colors[i * 3 + 2] = 1.0
      }
    }

    const pointGeo = new THREE.BufferGeometry()
    pointGeo.setAttribute('position', new THREE.BufferAttribute(positions, 3))
    pointGeo.setAttribute('color', new THREE.BufferAttribute(colors, 3))

    const pointMat = new THREE.PointsMaterial({
      size: 0.55,
      vertexColors: true,
      transparent: true,
      opacity: 0.85,
      blending: THREE.AdditiveBlending,
      sizeAttenuation: true,
      depthWrite: false,
    })
    const points = new THREE.Points(pointGeo, pointMat)
    scene.add(points)

    // ── Intra-team connecting lines (red↔red, blue↔blue) ────────
    const lineCapacity = N * 3 // worst-case edges
    const lineGeo = new THREE.BufferGeometry()
    const linePositions = new Float32Array(lineCapacity * 2 * 3)
    const lineColors    = new Float32Array(lineCapacity * 2 * 3)
    lineGeo.setAttribute('position', new THREE.BufferAttribute(linePositions, 3).setUsage(THREE.DynamicDrawUsage))
    lineGeo.setAttribute('color',    new THREE.BufferAttribute(lineColors,    3).setUsage(THREE.DynamicDrawUsage))
    const lineMat = new THREE.LineBasicMaterial({
      vertexColors: true,
      transparent: true,
      opacity: 0.18,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    })
    const lines = new THREE.LineSegments(lineGeo, lineMat)
    scene.add(lines)

    // ── Cross-team attack trace (single bright line, occasional) ─
    const traceGeo = new THREE.BufferGeometry()
    const tracePositions = new Float32Array(6)
    traceGeo.setAttribute('position', new THREE.BufferAttribute(tracePositions, 3).setUsage(THREE.DynamicDrawUsage))
    const traceMat = new THREE.LineBasicMaterial({
      color: 0xffffff,
      transparent: true,
      opacity: 0,
      blending: THREE.AdditiveBlending,
    })
    const trace = new THREE.LineSegments(traceGeo, traceMat)
    scene.add(trace)
    let traceOpacity = 0
    let lastTraceAt = performance.now()

    // ── Mouse interaction (parallax + drag rotate) ───────────────
    const target = { x: 0, y: 0 }
    const cur    = { x: 0, y: 0 }
    let dragging = false
    let dragStart = { x: 0, y: 0, rotX: 0, rotY: 0 }
    let groupRotX = 0
    let groupRotY = 0

    const onMove = (e) => {
      const rect = container.getBoundingClientRect()
      const nx = ((e.clientX - rect.left) / rect.width) * 2 - 1
      const ny = ((e.clientY - rect.top) / rect.height) * 2 - 1
      if (dragging) {
        groupRotY = dragStart.rotY + (nx - dragStart.x) * 1.2
        groupRotX = dragStart.rotX - (ny - dragStart.y) * 0.8
      } else {
        target.x = nx
        target.y = ny
      }
    }
    const onDown = (e) => {
      dragging = true
      const rect = container.getBoundingClientRect()
      dragStart.x = ((e.clientX - rect.left) / rect.width) * 2 - 1
      dragStart.y = ((e.clientY - rect.top) / rect.height) * 2 - 1
      dragStart.rotX = groupRotX
      dragStart.rotY = groupRotY
    }
    const onUp = () => { dragging = false }
    const onLeave = () => { target.x = 0; target.y = 0; dragging = false }

    container.addEventListener('pointermove', onMove)
    container.addEventListener('pointerdown', onDown)
    window.addEventListener('pointerup', onUp)
    container.addEventListener('pointerleave', onLeave)

    const ro = new ResizeObserver(resize)
    ro.observe(container)

    // ── Animation loop ──────────────────────────────────────────
    let raf
    let last = performance.now()
    const minFrameInterval = profile.fpsCap > 0 ? 1000 / profile.fpsCap : 0

    const tick = (now) => {
      raf = requestAnimationFrame(tick)
      if (document.visibilityState === 'hidden') return
      if (minFrameInterval && now - last < minFrameInterval) return
      const dt = Math.min(64, now - last)
      last = now

      // Drift particles
      const pos = pointGeo.attributes.position.array
      for (let i = 0; i < N; i++) {
        pos[i * 3]     += speeds[i * 3]
        pos[i * 3 + 1] += speeds[i * 3 + 1]
        pos[i * 3 + 2] += speeds[i * 3 + 2]
        const r = Math.hypot(pos[i * 3] - (teamArr[i] === 0 ? -8 : 8), pos[i * 3 + 1], pos[i * 3 + 2])
        if (r > 50) {
          speeds[i * 3]     *= -1
          speeds[i * 3 + 1] *= -1
          speeds[i * 3 + 2] *= -1
        }
      }
      pointGeo.attributes.position.needsUpdate = true

      // Build connecting lines (intra-team only, sparse)
      let edgeIdx = 0
      const dist2 = profile.connectDist * profile.connectDist
      const stride = tier === 1 ? 4 : 2 // skip-sample on tier 1 for perf
      for (let i = 0; i < N; i += stride) {
        for (let j = i + stride; j < Math.min(i + 40, N); j += stride) {
          if (teamArr[i] !== teamArr[j]) continue
          const dx = pos[i * 3]     - pos[j * 3]
          const dy = pos[i * 3 + 1] - pos[j * 3 + 1]
          const dz = pos[i * 3 + 2] - pos[j * 3 + 2]
          const d2 = dx * dx + dy * dy + dz * dz
          if (d2 < dist2 && edgeIdx < lineCapacity) {
            const k = edgeIdx * 6
            linePositions[k]     = pos[i * 3]
            linePositions[k + 1] = pos[i * 3 + 1]
            linePositions[k + 2] = pos[i * 3 + 2]
            linePositions[k + 3] = pos[j * 3]
            linePositions[k + 4] = pos[j * 3 + 1]
            linePositions[k + 5] = pos[j * 3 + 2]
            const cr = colors[i * 3], cg = colors[i * 3 + 1], cb = colors[i * 3 + 2]
            lineColors[k]     = cr; lineColors[k + 1] = cg; lineColors[k + 2] = cb
            lineColors[k + 3] = cr; lineColors[k + 4] = cg; lineColors[k + 5] = cb
            edgeIdx++
          }
        }
      }
      lineGeo.setDrawRange(0, edgeIdx * 2)
      lineGeo.attributes.position.needsUpdate = true
      lineGeo.attributes.color.needsUpdate = true

      // Occasional cross-team attack trace
      if (profile.attackInterval > 0 && now - lastTraceAt > profile.attackInterval) {
        let a = (Math.random() * N) | 0
        let b = (Math.random() * N) | 0
        // ensure cross-team
        let guard = 0
        while (teamArr[a] === teamArr[b] && guard < 8) { b = (Math.random() * N) | 0; guard++ }
        tracePositions[0] = pos[a * 3]
        tracePositions[1] = pos[a * 3 + 1]
        tracePositions[2] = pos[a * 3 + 2]
        tracePositions[3] = pos[b * 3]
        tracePositions[4] = pos[b * 3 + 1]
        tracePositions[5] = pos[b * 3 + 2]
        traceGeo.attributes.position.needsUpdate = true
        traceOpacity = 1
        lastTraceAt = now
      }
      if (traceOpacity > 0) {
        traceOpacity -= 0.02 * (dt / 16.6)
        traceMat.opacity = Math.max(0, traceOpacity)
      }

      // Smooth camera parallax + drag rotation
      cur.x += (target.x - cur.x) * 0.04
      cur.y += (target.y - cur.y) * 0.04
      const rotY = groupRotY + cur.x * 0.18
      const rotX = groupRotX + cur.y * 0.10
      points.rotation.y = rotY
      points.rotation.x = rotX
      lines.rotation.y  = rotY
      lines.rotation.x  = rotX
      trace.rotation.y  = rotY
      trace.rotation.x  = rotX

      renderer.render(scene, camera)
    }
    raf = requestAnimationFrame(tick)

    return () => {
      cancelAnimationFrame(raf)
      ro.disconnect()
      container.removeEventListener('pointermove', onMove)
      container.removeEventListener('pointerdown', onDown)
      window.removeEventListener('pointerup', onUp)
      container.removeEventListener('pointerleave', onLeave)
      pointGeo.dispose()
      lineGeo.dispose()
      traceGeo.dispose()
      pointMat.dispose()
      lineMat.dispose()
      traceMat.dispose()
      renderer.dispose()
      if (renderer.domElement.parentNode === container) {
        container.removeChild(renderer.domElement)
      }
    }
  }, [tier])

  if (tier <= 0) {
    // Static SVG fallback for reduced-motion / very weak devices
    return (
      <div className={`absolute inset-0 perf-fallback ${className}`} style={{ zIndex: 0 }}>
        <svg viewBox="0 0 800 600" className="w-full h-full opacity-50">
          <defs>
            <radialGradient id="rg" cx="50%" cy="50%" r="50%">
              <stop offset="0%"  stopColor="#3b8bff" stopOpacity="0.18" />
              <stop offset="50%" stopColor="#ff3b3b" stopOpacity="0.08" />
              <stop offset="100%" stopColor="#08090c" stopOpacity="0" />
            </radialGradient>
          </defs>
          <rect width="800" height="600" fill="url(#rg)" />
        </svg>
      </div>
    )
  }

  return (
    <div
      ref={containerRef}
      className={`absolute inset-0 perf-3d ${className}`}
      style={{ zIndex: 0, cursor: 'grab', touchAction: 'none' }}
      aria-hidden="true"
    />
  )
}
