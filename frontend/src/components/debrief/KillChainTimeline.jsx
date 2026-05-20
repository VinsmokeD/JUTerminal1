import { useEffect, useMemo, useRef, useState } from 'react'
import * as THREE from 'three'
import { usePerfTier } from '../ui/PerfTier'
import Badge from '../ui/Badge'

const X_MIN = -18
const X_MAX = 18
const RED_Y = 2.2
const BLUE_Y = -2.2
const MATCH_WINDOW_MS = 30000

// ── Severity → node radius mapping ────────────────────────────────────────
const SEV_RADIUS = { CRITICAL: 0.55, HIGH: 0.42, MED: 0.32, MEDIUM: 0.32, LOW: 0.24, INFO: 0.22 }
const nodeRadius = (item) => SEV_RADIUS[(item.severity || 'LOW').toUpperCase()] || 0.28

export default function KillChainTimeline({ commands = [], siemEvents = [], causeEffect = [] }) {
  const containerRef = useRef(null)
  const tier = usePerfTier()
  const [selected, setSelected] = useState(null)
  const selectedRef = useRef(null)
  const timeline = useMemo(() => buildTimeline(commands, siemEvents, causeEffect), [commands, siemEvents, causeEffect])

  useEffect(() => {
    selectedRef.current = selected
  }, [selected])

  useEffect(() => {
    const container = containerRef.current
    if (!container || tier <= 0 || timeline.isEmpty) return

    // ── Scene ────────────────────────────────────────────────────────────
    const scene = new THREE.Scene()
    scene.fog = new THREE.FogExp2(0x060810, tier >= 2 ? 0.028 : 0.04)

    const camera = new THREE.PerspectiveCamera(50, 1, 0.1, 140)
    camera.position.set(0, 5.5, 22)
    camera.lookAt(0, 0, 0)

    const renderer = new THREE.WebGLRenderer({
      antialias: tier >= 2,
      alpha: false,
      powerPreference: 'high-performance',
    })
    renderer.setClearColor(0x060810, 1)
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, tier >= 3 ? 2 : 1.5))
    container.appendChild(renderer.domElement)

    const resize = () => {
      const w = container.clientWidth || 1
      const h = container.clientHeight || 1
      renderer.setSize(w, h, false)
      camera.aspect = w / h
      camera.updateProjectionMatrix()
    }
    resize()

    const root = new THREE.Group()
    scene.add(root)

    // ── Lighting ─────────────────────────────────────────────────────────
    scene.add(new THREE.AmbientLight(0x1a2040, 2.2))
    const keyLight = new THREE.DirectionalLight(0xffffff, 0.9)
    keyLight.position.set(8, 14, 12)
    scene.add(keyLight)
    // Red track light
    const redLight = new THREE.PointLight(0xff2244, tier >= 2 ? 3.5 : 2.0, 28)
    redLight.position.set(-6, RED_Y + 1, 5)
    scene.add(redLight)
    // Blue track light
    const blueLight = new THREE.PointLight(0x2255ff, tier >= 2 ? 3.5 : 2.0, 28)
    blueLight.position.set(6, BLUE_Y - 1, 5)
    scene.add(blueLight)
    // Center accent
    const centerLight = new THREE.PointLight(0x8844ff, 1.4, 20)
    centerLight.position.set(0, 0, 4)
    scene.add(centerLight)

    // ── Grid floor ───────────────────────────────────────────────────────
    if (tier >= 2) {
      root.add(buildGrid())
    }

    // ── Starfield background ─────────────────────────────────────────────
    if (tier >= 2) {
      scene.add(buildStarfield())
    }

    // ── Tracks ───────────────────────────────────────────────────────────
    addTrack(root, RED_Y, 0xff2244, tier)
    addTrack(root, BLUE_Y, 0x2255ff, tier)

    // ── Track end caps ───────────────────────────────────────────────────
    addEndCap(root, X_MIN, RED_Y, 0xff2244, tier)
    addEndCap(root, X_MAX, RED_Y, 0xff2244, tier)
    addEndCap(root, X_MIN, BLUE_Y, 0x2255ff, tier)
    addEndCap(root, X_MAX, BLUE_Y, 0x2255ff, tier)

    // ── Nodes ────────────────────────────────────────────────────────────
    const redMeshes = addNodes(root, timeline.redItems, RED_Y, 0xff2244, tier, 'command')
    const blueMeshes = addNodes(root, timeline.blueItems, BLUE_Y, 0x2255ff, tier, 'event')

    // ── Arc connections ───────────────────────────────────────────────────
    if (tier >= 2) addArcConnections(root, timeline.matches)

    // ── Pulse rings pool ─────────────────────────────────────────────────
    const pulseRings = tier >= 2 ? buildPulseRings(timeline.redItems, RED_Y, timeline.blueItems, BLUE_Y) : []
    pulseRings.forEach((r) => root.add(r.mesh))

    // ── Interaction state ─────────────────────────────────────────────────
    let hovered = false
    let dragging = false
    let dragThreshold = 0
    let lastPointer = { x: 0, y: 0 }
    let pan = { x: 0, y: 0 }
    let panTarget = { x: 0, y: 0 }
    let angle = 0
    let raf

    const raycaster = new THREE.Raycaster()
    const mouse = new THREE.Vector2()

    const onEnter = () => { hovered = true }
    const onLeave = () => { hovered = false; dragging = false }
    const onDown = (e) => {
      dragging = true
      dragThreshold = 0
      lastPointer = { x: e.clientX, y: e.clientY }
      container.setPointerCapture?.(e.pointerId)
    }
    const onMove = (e) => {
      if (!dragging) return
      const dx = e.clientX - lastPointer.x
      const dy = e.clientY - lastPointer.y
      dragThreshold += Math.abs(dx) + Math.abs(dy)
      lastPointer = { x: e.clientX, y: e.clientY }
      panTarget.x = THREE.MathUtils.clamp(panTarget.x + dx * 0.03, -6, 6)
      panTarget.y = THREE.MathUtils.clamp(panTarget.y - dy * 0.02, -2.5, 2.5)
    }
    const onUp = (e) => {
      if (dragging && dragThreshold < 5) {
        // Handle click/tap as selection
        const rect = container.getBoundingClientRect()
        mouse.x = ((e.clientX - rect.left) / rect.width) * 2 - 1
        mouse.y = -((e.clientY - rect.top) / rect.height) * 2 + 1
        raycaster.setFromCamera(mouse, camera)
        const intersects = raycaster.intersectObjects([...redMeshes, ...blueMeshes])
        if (intersects.length > 0) {
          const { item, kind } = intersects[0].object.userData
          setSelected({ item, kind })
        } else {
          setSelected(null)
        }
      }
      dragging = false
      container.releasePointerCapture?.(e.pointerId)
    }

    container.addEventListener('pointerenter', onEnter)
    container.addEventListener('pointerleave', onLeave)
    container.addEventListener('pointerdown', onDown)
    container.addEventListener('pointermove', onMove)
    window.addEventListener('pointerup', onUp)
    const ro = new ResizeObserver(resize)
    ro.observe(container)

    const clock = new THREE.Clock()

    const tick = () => {
      raf = requestAnimationFrame(tick)
      if (document.visibilityState === 'hidden') return

      const elapsed = clock.getElapsedTime()
      const dt = clock.getDelta()

      // Smooth pan interpolation
      pan.x += (panTarget.x - pan.x) * 0.08
      pan.y += (panTarget.y - pan.y) * 0.08

      if (!hovered && !dragging) angle += 0.0018
      const radius = 22
      camera.position.x = Math.sin(angle) * 4 + pan.x
      camera.position.z = Math.cos(angle) * 1.5 + radius
      camera.position.y = 5.5 + Math.sin(elapsed * 0.18) * 0.4 + pan.y
      camera.lookAt(pan.x * 0.5, pan.y * 0.3, 0)

      // Subtle root sway
      root.rotation.y = Math.sin(elapsed * 0.22) * 0.025

      // Animate red/blue point lights pulsing
      redLight.intensity = (tier >= 2 ? 3.5 : 2.0) + Math.sin(elapsed * 1.4) * 0.6
      blueLight.intensity = (tier >= 2 ? 3.5 : 2.0) + Math.sin(elapsed * 1.4 + Math.PI) * 0.6

      // Animate node pulse
      const currentSelected = selectedRef.current
      redMeshes.forEach((m, i) => {
        const isSelected = currentSelected?.kind === 'command' && currentSelected?.item.id === m.userData.item.id
        const phase = elapsed * 2.4 + i * 0.45
        const baseScale = isSelected ? 1.4 : 1.0
        m.scale.setScalar(baseScale + Math.sin(phase) * (isSelected ? 0.15 : 0.08))
        if (m.material) {
          m.material.emissiveIntensity = isSelected ? 2.5 : (tier >= 2 ? 1.1 : 0.4)
        }
      })
      blueMeshes.forEach((m, i) => {
        const isSelected = currentSelected?.kind === 'event' && currentSelected?.item.id === m.userData.item.id
        const phase = elapsed * 2.4 + i * 0.45 + Math.PI
        const baseScale = isSelected ? 1.4 : 1.0
        m.scale.setScalar(baseScale + Math.sin(phase) * (isSelected ? 0.15 : 0.08))
        if (m.material) {
          m.material.emissiveIntensity = isSelected ? 2.5 : (tier >= 2 ? 1.1 : 0.4)
        }
      })

      // Animate pulse rings
      pulseRings.forEach((ring) => {
        ring.t = (ring.t + dt * 0.55) % 1.0
        const s = 1 + ring.t * 2.8
        ring.mesh.scale.setScalar(s)
        ring.mesh.material.opacity = (1 - ring.t) * 0.55
      })

      renderer.render(scene, camera)
    }
    raf = requestAnimationFrame(tick)

    return () => {
      cancelAnimationFrame(raf)
      ro.disconnect()
      container.removeEventListener('pointerenter', onEnter)
      container.removeEventListener('pointerleave', onLeave)
      container.removeEventListener('pointerdown', onDown)
      container.removeEventListener('pointermove', onMove)
      window.removeEventListener('pointerup', onUp)
      scene.traverse((obj) => {
        if (obj.geometry) obj.geometry.dispose()
        if (obj.material) {
          const mats = Array.isArray(obj.material) ? obj.material : [obj.material]
          mats.forEach((m) => { if (m.map) m.map.dispose(); m.dispose() })
        }
      })
      renderer.dispose()
      if (renderer.domElement.parentNode === container) container.removeChild(renderer.domElement)
    }
  }, [tier, timeline])

  if (tier <= 0 || timeline.isEmpty) return <TimelineFallback timeline={timeline} />

  return (
    <div className="h-[300px] w-full overflow-hidden rounded-cs-lg bg-[#060810] border border-cs-border relative">
      <div
        ref={containerRef}
        className="absolute inset-0"
        style={{ cursor: 'grab', touchAction: 'none' }}
        aria-label="3D kill-chain timeline"
      />
      {/* Legend overlay */}
      <div className="pointer-events-none absolute left-3 top-3 flex flex-col gap-1.5">
        <div className="flex items-center gap-2">
          <span className="inline-block w-5 h-0.5 bg-[#ff2244] rounded-full shadow-[0_0_6px_#ff2244]" />
          <span className="text-[10px] font-mono uppercase tracking-[0.12em] text-[#ff2244]">Red Team commands</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="inline-block w-5 h-0.5 bg-[#2255ff] rounded-full shadow-[0_0_6px_#2255ff]" />
          <span className="text-[10px] font-mono uppercase tracking-[0.12em] text-[#5588ff]">Blue Team detections</span>
        </div>
      </div>
      {/* Stats */}
      <div className="pointer-events-none absolute right-3 top-3 text-right">
        <div className="text-[10px] font-mono text-txt-dim/70">
          {timeline.redItems.length} attacks · {timeline.blueItems.length} detections · {timeline.matches.length} linked
        </div>
      </div>
      {/* Drag hint */}
      <div className="pointer-events-none absolute bottom-2 left-1/2 -translate-x-1/2 text-[9px] font-mono text-txt-dim/40 tracking-widest uppercase">
        {selected ? 'click empty space to clear' : 'drag to rotate · click node for details'}
      </div>

      {/* Detail Overlay */}
      {selected && (
        <div className="absolute right-4 bottom-4 w-72 bg-[#0a0c18]/95 border border-[#2244aa]/50 rounded-cs p-4 shadow-2xl backdrop-blur-md animate-in fade-in slide-in-from-bottom-2 duration-300">
          <div className="flex items-center justify-between mb-3">
            <Badge tone={selected.kind === 'command' ? 'red' : 'blue'}>
              {selected.kind === 'command' ? 'RED TEAM ACTION' : 'BLUE TEAM DETECTION'}
            </Badge>
            <button onClick={() => setSelected(null)} className="text-txt-dim hover:text-txt-primary transition-colors">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          <div className="space-y-3">
            <div>
              <div className="text-[10px] font-mono text-txt-dim uppercase tracking-wider mb-1">
                {selected.kind === 'command' ? 'Command' : 'Alert Message'}
              </div>
              <div className="text-xs font-mono text-txt-primary break-all leading-relaxed bg-void/50 p-2 rounded-cs-sm border border-cs-border/30">
                {selected.item.command || selected.item.message}
              </div>
            </div>

            {selected.item.mitre_technique && (
              <div>
                <div className="text-[10px] font-mono text-txt-dim uppercase tracking-wider mb-1">MITRE ATT&CK</div>
                <div className="text-[10px] font-mono text-cs-blue">{selected.item.mitre_technique}</div>
              </div>
            )}

            <div className="flex items-center justify-between pt-2 border-t border-cs-border/30">
              <div className="text-[10px] font-mono text-txt-dim">
                {new Date(selected.item.ms).toLocaleTimeString()}
              </div>
              {selected.item.severity && (
                <div className={`text-[10px] font-bold font-mono ${
                  selected.item.severity === 'CRITICAL' ? 'text-cs-red' :
                  selected.item.severity === 'HIGH' ? 'text-amber-warn' : 'text-cs-blue'
                }`}>
                  {selected.item.severity}
                </div>
              )}
            </div>

            {/* Links Section */}
            {selected.kind === 'command' && (
              <div className="pt-2">
                <div className="text-[10px] font-mono text-txt-dim uppercase tracking-wider mb-2">Detection Links</div>
                {timeline.matches.filter(m => m.command.id === selected.item.id).length > 0 ? (
                  <div className="space-y-1.5">
                    {timeline.matches.filter(m => m.command.id === selected.item.id).map((m, idx) => (
                      <button
                        key={idx}
                        onClick={() => setSelected({ item: m.event, kind: 'event' })}
                        className="w-full flex items-center gap-2 text-[10px] font-mono text-cs-blue bg-cs-blue/5 border border-cs-blue/20 hover:bg-cs-blue/10 rounded-cs-sm px-2 py-1.5 transition-colors text-left"
                      >
                        <span className="w-1.5 h-1.5 rounded-full bg-cs-blue" />
                        <span className="truncate flex-1">{m.event.message}</span>
                        <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                        </svg>
                      </button>
                    ))}
                  </div>
                ) : (
                  <div className="text-[10px] font-mono text-txt-dim italic">No direct detection link found.</div>
                )}
              </div>
            )}

            {selected.kind === 'event' && (
              <div className="pt-2">
                <div className="text-[10px] font-mono text-txt-dim uppercase tracking-wider mb-2">Caused By</div>
                {timeline.matches.filter(m => m.event.id === selected.item.id).length > 0 ? (
                  <div className="space-y-1.5">
                    {timeline.matches.filter(m => m.event.id === selected.item.id).map((m, idx) => (
                      <button
                        key={idx}
                        onClick={() => setSelected({ item: m.command, kind: 'command' })}
                        className="w-full flex items-center gap-2 text-[10px] font-mono text-cs-red bg-cs-red/5 border border-cs-red/20 hover:bg-cs-red/10 rounded-cs-sm px-2 py-1.5 transition-colors text-left"
                      >
                        <span className="w-1.5 h-1.5 rounded-full bg-cs-red" />
                        <span className="truncate flex-1">{m.command.command}</span>
                        <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                        </svg>
                      </button>
                    ))}
                  </div>
                ) : (
                  <div className="text-[10px] font-mono text-txt-dim italic">Signal correlation pending.</div>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// Timeline data builder
// ─────────────────────────────────────────────────────────────────────────────

function buildTimeline(commands, siemEvents, causeEffect) {
  const toMs = (v) => v ? new Date(v).getTime() : 0
  const redRaw = commands
    .map((c, i) => ({ ...c, type: 'command', index: i, ms: toMs(c.created_at || c.timestamp) }))
    .filter((item) => Number.isFinite(item.ms) && item.ms > 0)
    .sort((a, b) => a.ms - b.ms)
  const blueRaw = siemEvents
    .filter((e) => !e.noise)
    .map((e, i) => ({ ...e, type: 'event', index: i, ms: toMs(e.created_at || e.timestamp) }))
    .filter((item) => Number.isFinite(item.ms) && item.ms > 0)
    .sort((a, b) => a.ms - b.ms)
  const all = [...redRaw, ...blueRaw]
  const min = all.length ? Math.min(...all.map((x) => x.ms)) : Date.now() - 60000
  const max = all.length ? Math.max(...all.map((x) => x.ms)) : Date.now()
  const range = max - min || 1
  const place = (item) => ({ ...item, x: X_MIN + ((item.ms - min) / range) * (X_MAX - X_MIN) })
  const redItems = redRaw.map(place)
  const blueItems = blueRaw.map(place)

  // Link using causeEffect data if available, fallback to heuristic
  const matches = []
  if (causeEffect && causeEffect.length > 0) {
    causeEffect.forEach((ce) => {
      const cmd = redItems.find((r) => r.id === ce.command_id)
      if (cmd && ce.related_events) {
        ce.related_events.forEach((re) => {
          const ev = blueItems.find((b) => b.id === re.id)
          if (ev) matches.push({ command: cmd, event: ev })
        })
      }
    })
  } else {
    redItems.forEach((cmd) => {
      const ev = blueItems
        .map((c) => ({ ev: c, delta: Math.abs(c.ms - cmd.ms) }))
        .filter(({ delta }) => delta <= MATCH_WINDOW_MS)
        .sort((a, b) => a.delta - b.delta)[0]?.ev
      if (ev) matches.push({ command: cmd, event: ev })
    })
  }

  return { redItems, blueItems, matches, isEmpty: redItems.length === 0 && blueItems.length === 0 }
}

// ─────────────────────────────────────────────────────────────────────────────
// Scene builders
// ─────────────────────────────────────────────────────────────────────────────

function buildGrid() {
  const group = new THREE.Group()
  group.position.set(0, -3.5, 0)
  const SIZE = 42
  const DIVS = 22
  const STEP = SIZE / DIVS
  const positions = []
  for (let i = 0; i <= DIVS; i++) {
    const t = -SIZE / 2 + i * STEP
    // along X
    positions.push(-SIZE / 2, 0, t, SIZE / 2, 0, t)
    // along Z
    positions.push(t, 0, -SIZE / 2, t, 0, SIZE / 2)
  }
  const geo = new THREE.BufferGeometry()
  geo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3))
  const mat = new THREE.LineBasicMaterial({ color: 0x1a2a4a, transparent: true, opacity: 0.45 })
  group.add(new THREE.LineSegments(geo, mat))

  // Brighter center cross
  const crossGeo = new THREE.BufferGeometry()
  crossGeo.setAttribute('position', new THREE.Float32BufferAttribute([
    -SIZE / 2, 0, 0, SIZE / 2, 0, 0,
    0, 0, -SIZE / 2, 0, 0, SIZE / 2,
  ], 3))
  group.add(new THREE.LineSegments(crossGeo, new THREE.LineBasicMaterial({ color: 0x2244aa, transparent: true, opacity: 0.6 })))
  return group
}

function buildStarfield() {
  const count = 280
  const positions = new Float32Array(count * 3)
  for (let i = 0; i < count; i++) {
    positions[i * 3]     = (Math.random() - 0.5) * 120
    positions[i * 3 + 1] = (Math.random() - 0.5) * 50 + 5
    positions[i * 3 + 2] = (Math.random() - 0.5) * 120 - 20
  }
  const geo = new THREE.BufferGeometry()
  geo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3))
  return new THREE.Points(geo, new THREE.PointsMaterial({
    color: 0x8899cc,
    size: 0.18,
    transparent: true,
    opacity: 0.55,
    sizeAttenuation: true,
  }))
}

function addTrack(root, y, color, tier) {
  const curve = new THREE.CatmullRomCurve3([
    new THREE.Vector3(X_MIN - 0.5, y, 0),
    new THREE.Vector3(-8, y, Math.sin(y) * 0.3),
    new THREE.Vector3(0, y, 0),
    new THREE.Vector3(8, y, -Math.sin(y) * 0.3),
    new THREE.Vector3(X_MAX + 0.5, y, 0),
  ])

  // Outer glow tube (transparent, wide)
  const glowGeo = new THREE.TubeGeometry(curve, tier >= 2 ? 80 : 30, 0.14, 8, false)
  const glowMat = new THREE.MeshStandardMaterial({
    color, emissive: color, emissiveIntensity: 0.3,
    transparent: true, opacity: 0.18, roughness: 1, metalness: 0,
  })
  root.add(new THREE.Mesh(glowGeo, glowMat))

  // Core tube (bright)
  const coreGeo = new THREE.TubeGeometry(curve, tier >= 2 ? 80 : 30, tier >= 2 ? 0.065 : 0.05, 8, false)
  const coreMat = new THREE.MeshStandardMaterial({
    color, emissive: color, emissiveIntensity: tier >= 2 ? 1.0 : 0.4,
    roughness: 0.2, metalness: 0.3,
  })
  root.add(new THREE.Mesh(coreGeo, coreMat))
}

function addEndCap(root, x, y, color, tier) {
  if (tier < 2) return
  const geo = new THREE.SphereGeometry(0.12, 10, 8)
  const mat = new THREE.MeshStandardMaterial({
    color, emissive: color, emissiveIntensity: 1.2,
    roughness: 0.1, metalness: 0.5,
  })
  const mesh = new THREE.Mesh(geo, mat)
  mesh.position.set(x, y, 0)
  root.add(mesh)
}

function addNodes(root, items, y, color, tier, kind) {
  const meshes = []
  items.forEach((item) => {
    const r = nodeRadius(item)

    // Outer glow sphere
    if (tier >= 2) {
      const glowGeo = new THREE.SphereGeometry(r * 2.2, 14, 10)
      const glowMat = new THREE.MeshStandardMaterial({
        color, emissive: color, emissiveIntensity: 0.15,
        transparent: true, opacity: 0.12, roughness: 1, metalness: 0, depthWrite: false,
      })
      const glowMesh = new THREE.Mesh(glowGeo, glowMat)
      glowMesh.position.set(item.x, y, 0)
      root.add(glowMesh)
    }

    // Core sphere
    const geo = new THREE.SphereGeometry(r, tier >= 2 ? 20 : 10, tier >= 2 ? 14 : 8)
    const mat = new THREE.MeshStandardMaterial({
      color, emissive: color,
      emissiveIntensity: tier >= 2 ? 1.1 : 0.4,
      roughness: 0.18, metalness: 0.35,
    })
    const sphere = new THREE.Mesh(geo, mat)
    sphere.position.set(item.x, y, 0)
    sphere.userData = { item, kind } // CRITICAL FOR INTERACTION
    root.add(sphere)
    meshes.push(sphere)

    // Spike / connector line from node to track-center
    if (tier >= 2 && kind === 'command') {
      const spikeGeo = new THREE.BufferGeometry()
      spikeGeo.setAttribute('position', new THREE.Float32BufferAttribute([
        item.x, y + r, 0,
        item.x, y + r * 2.0, 0,
      ], 3))
      const spikeMat = new THREE.LineBasicMaterial({ color, transparent: true, opacity: 0.45 })
      root.add(new THREE.LineSegments(spikeGeo, spikeMat))
    }

    // Label sprites (tier >= 2 only)
    if (tier >= 2) {
      const label = makeLabelSprite(labelFor(item, kind), color, item)
      label.position.set(item.x, y + (kind === 'command' ? r + 0.95 : -(r + 0.95)), 0)
      root.add(label)
    }
  })
  return meshes
}

function addArcConnections(root, matches) {
  if (!matches.length) return
  matches.forEach(({ command, event }, idx) => {
    const midX = (command.x + event.x) * 0.5
    const midY = 0
    const arcHeight = 1.6 + Math.abs(command.x - event.x) * 0.06
    const curve = new THREE.QuadraticBezierCurve3(
      new THREE.Vector3(command.x, RED_Y, 0),
      new THREE.Vector3(midX, midY + arcHeight, 0),
      new THREE.Vector3(event.x, BLUE_Y, 0),
    )
    const points = curve.getPoints(40)
    const geo = new THREE.BufferGeometry().setFromPoints(points)
    // Pulse opacity with index offset for visual variety
    const opacity = 0.35 + (idx % 3) * 0.1
    const mat = new THREE.LineBasicMaterial({
      color: 0xaa88ff,
      transparent: true,
      opacity,
      linewidth: 1,
    })
    root.add(new THREE.Line(geo, mat))

    // Small diamond at mid-arc
    const diamondGeo = new THREE.OctahedronGeometry(0.1, 0)
    const diamondMat = new THREE.MeshStandardMaterial({
      color: 0xcc88ff, emissive: 0xcc88ff, emissiveIntensity: 1.0,
      roughness: 0.2, metalness: 0.5,
    })
    const diamond = new THREE.Mesh(diamondGeo, diamondMat)
    const midPt = curve.getPoint(0.5)
    diamond.position.copy(midPt)
    diamond.rotation.y = Math.PI / 4
    root.add(diamond)
  })
}

function buildPulseRings(redItems, ry, blueItems, by) {
  const rings = []
  const allItems = [
    ...redItems.slice(-3).map((i) => ({ ...i, y: ry, color: 0xff2244 })),
    ...blueItems.slice(-3).map((i) => ({ ...i, y: by, color: 0x2255ff })),
  ]
  allItems.forEach((item, idx) => {
    const r = nodeRadius(item)
    const geo = new THREE.RingGeometry(r * 1.1, r * 1.4, 32)
    const mat = new THREE.MeshBasicMaterial({
      color: item.color,
      transparent: true,
      opacity: 0.55,
      side: THREE.DoubleSide,
      depthWrite: false,
    })
    const mesh = new THREE.Mesh(geo, mat)
    mesh.position.set(item.x, item.y, 0)
    rings.push({ mesh, t: (idx / allItems.length) })
  })
  return rings
}

// ─────────────────────────────────────────────────────────────────────────────
// Label sprites
// ─────────────────────────────────────────────────────────────────────────────

function makeLabelSprite(text, color, item) {
  const canvas = document.createElement('canvas')
  canvas.width = 224
  canvas.height = 52
  const ctx = canvas.getContext('2d')
  ctx.clearRect(0, 0, canvas.width, canvas.height)

  // Background pill
  const hexColor = `#${color.toString(16).padStart(6, '0')}`
  ctx.fillStyle = 'rgba(6,8,16,0.72)'
  ctx.beginPath()
  ctx.roundRect(2, 6, canvas.width - 4, canvas.height - 12, 6)
  ctx.fill()

  // Severity dot
  const sev = (item.severity || '').toUpperCase()
  const dotColor = sev === 'CRITICAL' ? '#ff0033' : sev === 'HIGH' ? '#ff4422' : hexColor
  ctx.fillStyle = dotColor
  ctx.beginPath()
  ctx.arc(16, canvas.height / 2, 4, 0, Math.PI * 2)
  ctx.fill()

  // Main text
  ctx.font = 'bold 11px "JetBrains Mono", "Courier New", monospace'
  ctx.textAlign = 'left'
  ctx.textBaseline = 'middle'
  ctx.fillStyle = 'rgba(220,225,240,0.95)'
  ctx.shadowColor = hexColor
  ctx.shadowBlur = 6
  ctx.fillText(truncate(text, 21), 26, canvas.height / 2 - 5)

  // MITRE technique tag
  const mitre = item.mitre_technique || item.mitre_id || ''
  if (mitre) {
    ctx.font = '9px "JetBrains Mono", monospace'
    ctx.fillStyle = hexColor
    ctx.shadowBlur = 0
    ctx.fillText(mitre, 26, canvas.height / 2 + 8)
  }

  const texture = new THREE.CanvasTexture(canvas)
  texture.minFilter = THREE.LinearFilter
  const mat = new THREE.SpriteMaterial({ map: texture, transparent: true, depthWrite: false })
  const sprite = new THREE.Sprite(mat)
  sprite.scale.set(4.2, 1.05, 1)
  return sprite
}

function labelFor(item, kind) {
  if (kind === 'command') return item.command || item.tool || 'command'
  return item.message || item.mitre_technique || item.source || 'event'
}

function truncate(val, max) {
  const t = String(val || '')
  return t.length > max ? `${t.slice(0, max - 1)}…` : t
}

// ─────────────────────────────────────────────────────────────────────────────
// 2D fallback (no WebGL / low tier)
// ─────────────────────────────────────────────────────────────────────────────

function TimelineFallback({ timeline }) {
  const red = timeline.redItems || []
  const blue = timeline.blueItems || []
  return (
    <div className="h-[300px] w-full rounded-cs-lg border border-cs-border bg-[#060810] overflow-hidden p-4">
      <div className="h-full rounded-cs bg-surface-1/70 border border-cs-border/60 p-4 flex flex-col justify-center gap-8">
        <FallbackTrack color="red" label="Red Team commands" items={red} />
        <FallbackTrack color="blue" label="Blue Team detections" items={blue} />
        {timeline.isEmpty && (
          <div className="text-center text-xs text-txt-dim font-mono">No timeline data yet — complete a mission to see the kill chain</div>
        )}
      </div>
    </div>
  )
}

function FallbackTrack({ color, label, items }) {
  const isRed = color === 'red'
  const textClass = isRed ? 'text-cs-red' : 'text-cs-blue'
  const railClass = isRed ? 'bg-cs-red/40' : 'bg-cs-blue/40'
  const dotClass = isRed ? 'bg-cs-red shadow-[0_0_6px_#ff3b3b]' : 'bg-cs-blue shadow-[0_0_6px_#3b8bff]'
  return (
    <div>
      <div className={`mb-2 text-[10px] font-mono uppercase tracking-[0.12em] ${textClass}`}>{label} ({items.length})</div>
      <div className="relative h-8 rounded-full bg-surface-3">
        <div className={`absolute left-0 right-0 top-1/2 h-px -translate-y-1/2 ${railClass}`} />
        {items.map((item, _index) => (
          <div
            key={`${label}-${item.id || _index}`}
            className={`absolute top-1/2 h-3 w-3 -translate-y-1/2 rounded-full ${dotClass}`}
            style={{ left: `${Math.max(2, Math.min(96, ((item.x - X_MIN) / (X_MAX - X_MIN)) * 100))}%` }}
            title={labelFor(item, color === 'red' ? 'command' : 'event')}
          />
        ))}
      </div>
    </div>
  )
}
