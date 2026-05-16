import { useEffect, useMemo, useRef } from 'react'
import * as THREE from 'three'
import { usePerfTier } from '../ui/PerfTier'

const X_MIN = -20
const X_MAX = 20
const RED_Y = 1.5
const BLUE_Y = -1.5
const MATCH_WINDOW_MS = 30000

export default function KillChainTimeline({ commands = [], siemEvents = [] }) {
  const containerRef = useRef(null)
  const tier = usePerfTier()
  const timeline = useMemo(() => buildTimeline(commands, siemEvents), [commands, siemEvents])

  useEffect(() => {
    const container = containerRef.current
    if (!container || tier <= 0 || timeline.isEmpty) return

    const scene = new THREE.Scene()
    scene.fog = new THREE.FogExp2(0x08090c, 0.035)

    const camera = new THREE.PerspectiveCamera(52, 1, 0.1, 120)
    camera.position.set(0, 4, 20)
    camera.lookAt(0, 0, 0)

    const renderer = new THREE.WebGLRenderer({
      antialias: tier >= 2,
      alpha: true,
      powerPreference: 'high-performance',
    })
    renderer.setClearColor(0x08090c, 1)
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, tier >= 3 ? 2 : 1.35))
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

    scene.add(new THREE.AmbientLight(0x222222, 1.7))
    const dir = new THREE.DirectionalLight(0xffffff, 1.35)
    dir.position.set(9, 12, 10)
    scene.add(dir)
    const redLight = new THREE.PointLight(0xff3b3b, 2.6, 24)
    redLight.position.set(-8, RED_Y, 6)
    scene.add(redLight)
    const blueLight = new THREE.PointLight(0x3b8bff, 2.6, 24)
    blueLight.position.set(8, BLUE_Y, 6)
    scene.add(blueLight)

    addTrack(root, RED_Y, 0xff3b3b, tier)
    addTrack(root, BLUE_Y, 0x3b8bff, tier)
    addNodes(root, timeline.redItems, RED_Y, 0xff3b3b, tier, 'command')
    addNodes(root, timeline.blueItems, BLUE_Y, 0x3b8bff, tier, 'event')
    if (tier >= 2) addDetectionLines(root, timeline.matches)

    let hovered = false
    let dragging = false
    let lastPointer = { x: 0, y: 0 }
    let pan = { x: 0, y: 0 }
    let angle = 0
    let raf

    const onEnter = () => { hovered = true }
    const onLeave = () => { hovered = false; dragging = false }
    const onDown = (e) => {
      dragging = true
      lastPointer = { x: e.clientX, y: e.clientY }
      container.setPointerCapture?.(e.pointerId)
    }
    const onMove = (e) => {
      if (!dragging) return
      const dx = e.clientX - lastPointer.x
      const dy = e.clientY - lastPointer.y
      lastPointer = { x: e.clientX, y: e.clientY }
      pan.x += dx * 0.025
      pan.y -= dy * 0.018
      pan.x = THREE.MathUtils.clamp(pan.x, -5, 5)
      pan.y = THREE.MathUtils.clamp(pan.y, -2, 2)
    }
    const onUp = (e) => {
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

    const tick = () => {
      raf = requestAnimationFrame(tick)
      if (document.visibilityState === 'hidden') return
      if (!hovered && !dragging) angle += 0.0025
      const radius = 20
      camera.position.x = Math.sin(angle) * 3 + pan.x
      camera.position.z = Math.cos(angle) * 2 + radius
      camera.position.y = 4 + pan.y
      camera.lookAt(pan.x, pan.y * 0.35, 0)
      root.rotation.y = Math.sin(angle * 0.6) * 0.04
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
          const materials = Array.isArray(obj.material) ? obj.material : [obj.material]
          materials.forEach((material) => {
            if (material.map) material.map.dispose()
            material.dispose()
          })
        }
      })
      renderer.dispose()
      if (renderer.domElement.parentNode === container) container.removeChild(renderer.domElement)
    }
  }, [tier, timeline])

  if (tier <= 0 || timeline.isEmpty) return <TimelineFallback timeline={timeline} />

  return (
    <div className="h-[260px] w-full overflow-hidden rounded-cs-lg bg-void border border-cs-border relative">
      <div
        ref={containerRef}
        className="absolute inset-0"
        style={{ cursor: 'grab', touchAction: 'none' }}
        aria-label="3D kill-chain timeline"
      />
      <div className="pointer-events-none absolute left-3 top-3 flex gap-3 text-[10px] font-mono uppercase tracking-[0.12em]">
        <span className="text-cs-red">Red commands</span>
        <span className="text-cs-blue">Blue detections</span>
      </div>
    </div>
  )
}

function buildTimeline(commands, siemEvents) {
  const toMs = (value) => value ? new Date(value).getTime() : 0
  const redRaw = commands
    .map((command, index) => ({ ...command, type: 'command', index, ms: toMs(command.created_at || command.timestamp) }))
    .filter((item) => Number.isFinite(item.ms) && item.ms > 0)
    .sort((a, b) => a.ms - b.ms)
  const blueRaw = siemEvents
    .filter((event) => !event.noise)
    .map((event, index) => ({ ...event, type: 'event', index, ms: toMs(event.created_at || event.timestamp) }))
    .filter((item) => Number.isFinite(item.ms) && item.ms > 0)
    .sort((a, b) => a.ms - b.ms)
  const all = [...redRaw, ...blueRaw]
  const min = all.length ? Math.min(...all.map((item) => item.ms)) : Date.now() - 60000
  const max = all.length ? Math.max(...all.map((item) => item.ms)) : Date.now()
  const range = max - min || 1
  const place = (item) => ({ ...item, x: X_MIN + ((item.ms - min) / range) * (X_MAX - X_MIN) })
  const redItems = redRaw.map(place)
  const blueItems = blueRaw.map(place)
  const matches = redItems.map((command) => {
    const event = blueItems
      .map((candidate) => ({ event: candidate, delta: Math.abs(candidate.ms - command.ms) }))
      .filter(({ delta }) => delta <= MATCH_WINDOW_MS)
      .sort((a, b) => a.delta - b.delta)[0]?.event
    return event ? { command, event } : null
  }).filter(Boolean)
  return { redItems, blueItems, matches, isEmpty: redItems.length === 0 && blueItems.length === 0 }
}

function addTrack(root, y, color, tier) {
  const curve = new THREE.CatmullRomCurve3([
    new THREE.Vector3(X_MIN, y, 0),
    new THREE.Vector3(-7, y, Math.sin(y) * 0.4),
    new THREE.Vector3(7, y, -Math.sin(y) * 0.4),
    new THREE.Vector3(X_MAX, y, 0),
  ])
  const geometry = new THREE.TubeGeometry(curve, tier >= 2 ? 96 : 32, tier >= 2 ? 0.075 : 0.055, 10, false)
  const material = new THREE.MeshStandardMaterial({
    color,
    emissive: color,
    emissiveIntensity: tier >= 2 ? 0.65 : 0.25,
    roughness: 0.35,
    metalness: 0.25,
  })
  root.add(new THREE.Mesh(geometry, material))
}

function addNodes(root, items, y, color, tier, kind) {
  const geometry = new THREE.SphereGeometry(kind === 'command' ? 0.3 : 0.25, tier >= 2 ? 24 : 10, tier >= 2 ? 16 : 8)
  items.forEach((item, index) => {
    const material = new THREE.MeshStandardMaterial({
      color,
      emissive: color,
      emissiveIntensity: tier >= 2 ? 0.9 : 0.25,
      roughness: 0.28,
      metalness: 0.12,
    })
    const sphere = new THREE.Mesh(geometry.clone(), material)
    sphere.position.set(item.x, y, 0)
    sphere.scale.setScalar(1 + (index % 3) * 0.05)
    root.add(sphere)
    if (tier >= 2) {
      const label = makeLabelSprite(labelFor(item, kind), color)
      label.position.set(item.x, y + (kind === 'command' ? 0.72 : -0.72), 0)
      root.add(label)
    }
  })
  geometry.dispose()
}

function addDetectionLines(root, matches) {
  if (!matches.length) return
  const positions = new Float32Array(matches.length * 6)
  matches.forEach(({ command, event }, index) => {
    const offset = index * 6
    positions[offset] = command.x
    positions[offset + 1] = RED_Y
    positions[offset + 2] = 0
    positions[offset + 3] = event.x
    positions[offset + 4] = BLUE_Y
    positions[offset + 5] = 0
  })
  const geometry = new THREE.BufferGeometry()
  geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3))
  const material = new THREE.LineBasicMaterial({
    color: 0xffffff,
    transparent: true,
    opacity: 0.6,
  })
  root.add(new THREE.LineSegments(geometry, material))
}

function makeLabelSprite(text, color) {
  const canvas = document.createElement('canvas')
  canvas.width = 192
  canvas.height = 48
  const ctx = canvas.getContext('2d')
  ctx.clearRect(0, 0, canvas.width, canvas.height)
  ctx.font = '11px "JetBrains Mono", monospace'
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  ctx.fillStyle = 'rgba(232,234,240,0.95)'
  ctx.shadowColor = `#${color.toString(16).padStart(6, '0')}`
  ctx.shadowBlur = 8
  ctx.fillText(truncate(text, 20), canvas.width / 2, canvas.height / 2)
  const texture = new THREE.CanvasTexture(canvas)
  texture.minFilter = THREE.LinearFilter
  const material = new THREE.SpriteMaterial({ map: texture, transparent: true, depthWrite: false })
  const sprite = new THREE.Sprite(material)
  sprite.scale.set(3.8, 0.95, 1)
  return sprite
}

function labelFor(item, kind) {
  if (kind === 'command') return item.command || item.tool || 'command'
  return item.message || item.mitre_technique || item.source || 'event'
}

function truncate(value, max) {
  const text = String(value || '')
  return text.length > max ? `${text.slice(0, max - 1)}...` : text
}

function TimelineFallback({ timeline }) {
  const red = timeline.redItems || []
  const blue = timeline.blueItems || []
  return (
    <div className="h-[260px] w-full rounded-cs-lg border border-cs-border bg-void overflow-hidden p-4">
      <div className="h-full rounded-cs bg-surface-1/70 border border-cs-border/60 p-4 flex flex-col justify-center gap-8">
        <FallbackTrack color="red" label="Red commands" items={red} />
        <FallbackTrack color="blue" label="Blue detections" items={blue} />
        {timeline.isEmpty && (
          <div className="text-center text-xs text-txt-dim font-mono">No timeline data yet</div>
        )}
      </div>
    </div>
  )
}

function FallbackTrack({ color, label, items }) {
  const isRed = color === 'red'
  const textClass = isRed ? 'text-cs-red' : 'text-cs-blue'
  const railClass = isRed ? 'bg-cs-red/50' : 'bg-cs-blue/50'
  const dotClass = isRed ? 'bg-cs-red' : 'bg-cs-blue'
  return (
    <div>
      <div className={`mb-2 text-[10px] font-mono uppercase tracking-[0.12em] ${textClass}`}>{label}</div>
      <div className="relative h-8 rounded-full bg-surface-3">
        <div className={`absolute left-0 right-0 top-1/2 h-px -translate-y-1/2 ${railClass}`} />
        {items.map((item, index) => (
          <div
            key={`${label}-${item.id || index}`}
            className={`absolute top-1/2 h-3 w-3 -translate-y-1/2 rounded-full ${dotClass} shadow-z-1`}
            style={{ left: `${Math.max(2, Math.min(96, ((item.x - X_MIN) / (X_MAX - X_MIN)) * 100))}%` }}
            title={labelFor(item, color === 'red' ? 'command' : 'event')}
          />
        ))}
      </div>
    </div>
  )
}
