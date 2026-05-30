import { render, screen, fireEvent } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import SiemFeed from '../components/siem/SiemFeed'

// ── Mock the Zustand store so SiemFeed can render in isolation ─────────────
vi.mock('../store/sessionStore', () => ({
  useSessionStore: vi.fn(),
}))

// ── Mock the API module (SiemFeed imports api for triage saves) ────────────
vi.mock('../lib/api', () => ({
  default: { post: vi.fn().mockResolvedValue({ data: {} }) },
}))

import { useSessionStore } from '../store/sessionStore'

const SAMPLE_EVENTS = [
  { id: '1', severity: 'CRITICAL', message: 'Port scan detected',         source: 'waf',     mitre_technique: 'T1046', timestamp: '2026-05-30T10:00:00Z' },
  { id: '2', severity: 'HIGH',     message: 'SQLi attempt blocked',        source: 'waf',     mitre_technique: 'T1190', timestamp: '2026-05-30T10:01:00Z' },
  { id: '3', severity: 'LOW',      message: 'Normal auth login',           source: 'app',     mitre_technique: 'T1078', timestamp: '2026-05-30T10:02:00Z' },
  { id: '4', severity: 'INFO',     message: 'Background noise event',      source: 'background', noise: true, timestamp: '2026-05-30T10:03:00Z' },
]

function mockStore(events = SAMPLE_EVENTS) {
  useSessionStore.mockImplementation((selector) =>
    selector({ siemEvents: events })
  )
}

beforeEach(() => {
  mockStore()
})

describe('SiemFeed', () => {
  it('renders without crashing with no events', () => {
    mockStore([])
    render(<SiemFeed />)
    expect(screen.getByText('0 events')).toBeInTheDocument()
  })

  it('shows total event count in the toolbar', () => {
    render(<SiemFeed />)
    expect(screen.getByText(`${SAMPLE_EVENTS.length} events`)).toBeInTheDocument()
  })

  it('renders CRITICAL badge when critical events exist', () => {
    render(<SiemFeed />)
    expect(screen.getByText(/1 CRITICAL/i)).toBeInTheDocument()
  })

  it('renders HIGH badge when high events exist', () => {
    render(<SiemFeed />)
    expect(screen.getByText('1 HIGH')).toBeInTheDocument()
  })

  it('does not render CRITICAL alert badge when no critical events', () => {
    mockStore([{ id: '1', severity: 'LOW', message: 'Low event', source: 'app' }])
    const { container } = render(<SiemFeed />)
    // The animated CRITICAL alert badge has class "animate-pulse" — filter buttons don't
    expect(container.querySelector('.animate-pulse')).toBeNull()
  })

  it('severity filter buttons are present', () => {
    render(<SiemFeed />)
    // Severity filter pills: ALL, CRITICAL, HIGH, MED, LOW, INFO
    const allBtns = screen.getAllByRole('button', { name: 'ALL' })
    expect(allBtns.length).toBeGreaterThanOrEqual(1)
    expect(screen.getAllByRole('button', { name: 'CRITICAL' }).length).toBeGreaterThanOrEqual(1)
  })

  it('noise toggle button is present and shows "show noise" by default', () => {
    render(<SiemFeed />)
    // Default state: noise is visible, button says "show noise"
    expect(screen.getByText('show noise')).toBeInTheDocument()
  })

  it('shows search / filter input', () => {
    render(<SiemFeed />)
    expect(screen.getByPlaceholderText(/Filter by message/i)).toBeInTheDocument()
  })

  it('filtering by CRITICAL shows only critical events', () => {
    render(<SiemFeed />)
    fireEvent.click(screen.getByRole('button', { name: 'CRITICAL' }))
    // The "Port scan detected" message is CRITICAL
    expect(screen.getByText('Port scan detected')).toBeInTheDocument()
    // The "Normal auth login" is LOW — should not be visible after CRITICAL filter
    expect(screen.queryByText('Normal auth login')).toBeNull()
  })
})
