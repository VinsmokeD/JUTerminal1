import { renderHook, act } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

// ── Browser globals needed by useWebSocket ─────────────────────────────────
Object.defineProperty(window, 'location', {
  value: { protocol: 'http:', host: 'localhost' },
  writable: true,
})

// ── Mock the Zustand store ─────────────────────────────────────────────────
// useWebSocket calls useSessionStore() without a selector (destructuring),
// so the mock must return the state object when called without a function arg.
const _mockState = {
  addSiemEvent: vi.fn(),
  setScore: vi.fn(),
  setAiMode: vi.fn(),
  setActiveBranch: vi.fn(),
  addDiscoveries: vi.fn(),
  setPendingEvidence: vi.fn(),
  setPhase: vi.fn(),
}
vi.mock('../store/sessionStore', () => ({
  useSessionStore: vi.fn((selector) =>
    typeof selector === 'function' ? selector(_mockState) : _mockState
  ),
}))

// ── Minimal WebSocket mock ─────────────────────────────────────────────────
class MockWebSocket {
  constructor(url) {
    this.url = url
    this.readyState = 0 // CONNECTING
    MockWebSocket.instances.push(this)
  }
  send = vi.fn()
  close = vi.fn(() => { this.readyState = 3 })
  static instances = []
  static reset() { this.instances = [] }
}
MockWebSocket.CONNECTING = 0
MockWebSocket.OPEN       = 1
MockWebSocket.CLOSING    = 2
MockWebSocket.CLOSED     = 3

vi.stubGlobal('WebSocket', MockWebSocket)
vi.stubGlobal('localStorage', {
  getItem: vi.fn(() => 'test-token'),
  setItem: vi.fn(),
  removeItem: vi.fn(),
})

import { useWebSocket } from '../hooks/useWebSocket'

beforeEach(() => {
  MockWebSocket.reset()
  vi.useFakeTimers()
})

afterEach(() => {
  vi.useRealTimers()
  vi.clearAllMocks()
})

describe('useWebSocket', () => {
  it('creates a WebSocket connection for the given sessionId', () => {
    renderHook(() => useWebSocket('sess-abc'))
    expect(MockWebSocket.instances).toHaveLength(1)
    expect(MockWebSocket.instances[0].url).toContain('sess-abc')
  })

  it('starts in connecting state', () => {
    const { result } = renderHook(() => useWebSocket('sess-1'))
    expect(result.current.connectionState).toBe('connecting')
  })

  it('transitions to connected state on ws.onopen', () => {
    const { result } = renderHook(() => useWebSocket('sess-2'))
    act(() => {
      const ws = MockWebSocket.instances[0]
      ws.readyState = MockWebSocket.OPEN
      ws.onopen()
    })
    expect(result.current.connectionState).toBe('connected')
  })

  it('sends the auth token on open', () => {
    renderHook(() => useWebSocket('sess-3'))
    act(() => {
      const ws = MockWebSocket.instances[0]
      ws.readyState = MockWebSocket.OPEN
      ws.onopen()
    })
    const ws = MockWebSocket.instances[0]
    expect(ws.send).toHaveBeenCalledWith(expect.stringContaining('test-token'))
  })

  it('does not create a WebSocket when sessionId is falsy', () => {
    renderHook(() => useWebSocket(null))
    expect(MockWebSocket.instances).toHaveLength(0)
  })

  it('schedules reconnect on close (non-unauthorized)', () => {
    const { result } = renderHook(() => useWebSocket('sess-5'))
    act(() => {
      const ws = MockWebSocket.instances[0]
      ws.readyState = MockWebSocket.OPEN
      ws.onopen()
    })
    act(() => {
      const ws = MockWebSocket.instances[0]
      ws.onclose({ code: 1006, reason: '' })
    })
    // reconnect timer should be scheduled (delay=1000 on first attempt)
    expect(result.current.connectionState).toBe('disconnected')
    // After the timer fires, a new WS should be created
    act(() => { vi.advanceTimersByTime(1100) })
    expect(MockWebSocket.instances).toHaveLength(2)
  })
})
