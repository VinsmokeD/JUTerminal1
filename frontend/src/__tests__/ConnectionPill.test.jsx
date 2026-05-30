import { render, screen } from '@testing-library/react'
import { describe, it, expect } from 'vitest'
import ConnectionPill from '../components/workspace/ConnectionPill'

describe('ConnectionPill', () => {
  it.each([
    ['connected',    'Live'],
    ['connecting',   'Connecting'],
    ['disconnected', 'Reconnecting'],
    ['unauthorized', 'Session lost'],
  ])('shows label for state=%s', (state, expectedLabel) => {
    render(<ConnectionPill state={state} />)
    expect(screen.getByText(expectedLabel)).toBeInTheDocument()
  })

  it('defaults to Connecting when state is unrecognised', () => {
    render(<ConnectionPill state="bogus" />)
    expect(screen.getByText('Connecting')).toBeInTheDocument()
  })

  it('has aria-live="polite" for screen readers', () => {
    const { container } = render(<ConnectionPill state="connected" />)
    // The root span carries aria-live and aria-label
    const span = container.querySelector('[aria-live="polite"]')
    expect(span).not.toBeNull()
    expect(span).toHaveAttribute('aria-label', 'Connection Live')
  })

  it('shows an aria-label reflecting the status', () => {
    const { container } = render(<ConnectionPill state="disconnected" />)
    const span = container.querySelector('[aria-label]')
    expect(span).toHaveAttribute('aria-label', 'Connection Reconnecting')
  })
})
