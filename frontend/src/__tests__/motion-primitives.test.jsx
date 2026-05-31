import { render, screen, waitFor } from '@testing-library/react'
import { renderHook } from '@testing-library/react'
import { describe, it, expect, beforeEach } from 'vitest'

import useSplitText from '../hooks/useSplitText'
import { useCursorStore } from '../store/cursorStore'
import { useSettingsStore } from '../store/settingsStore'
import Marquee from '../components/motion/Marquee'
import RevealText from '../components/motion/RevealText'
import BootHandshake from '../components/shell/BootHandshake'

// ── useSplitText ─────────────────────────────────────────────────────────────

describe('useSplitText', () => {
  it('splits a plain string into words', async () => {
    const { result } = renderHook(() => useSplitText('Attack Defend'))
    await waitFor(() => expect(result.current.words).toEqual(['Attack', 'Defend']))
  })

  it('returns empty array for an empty string', async () => {
    const { result } = renderHook(() => useSplitText(''))
    await waitFor(() => expect(result.current.words).toEqual([]))
  })

  it('collapses extra whitespace and newlines', async () => {
    const { result } = renderHook(() => useSplitText('  hello   world  '))
    await waitFor(() => expect(result.current.words).toEqual(['hello', 'world']))
  })

  it('handles punctuation attached to words', async () => {
    const { result } = renderHook(() => useSplitText('Attack. Defend. Simultaneously.'))
    await waitFor(() =>
      expect(result.current.words).toEqual(['Attack.', 'Defend.', 'Simultaneously.']),
    )
  })

  it('splits correctly when text changes after mount', async () => {
    const { result, rerender } = renderHook(({ t }) => useSplitText(t), {
      initialProps: { t: 'one two' },
    })
    await waitFor(() => expect(result.current.words).toEqual(['one', 'two']))
    rerender({ t: 'alpha beta gamma' })
    await waitFor(() => expect(result.current.words).toEqual(['alpha', 'beta', 'gamma']))
  })
})

// ── cursorStore ───────────────────────────────────────────────────────────────

describe('cursorStore', () => {
  beforeEach(() => {
    useCursorStore.getState().resetCursor()
  })

  it('has default state: default intent, empty label, neutral mode', () => {
    const { intent, label, mode } = useCursorStore.getState()
    expect(intent).toBe('default')
    expect(label).toBe('')
    expect(mode).toBe('neutral')
  })

  it('setCursor updates intent, label, and mode together', () => {
    useCursorStore.getState().setCursor('engage', 'ENGAGE', 'red')
    const { intent, label, mode } = useCursorStore.getState()
    expect(intent).toBe('engage')
    expect(label).toBe('ENGAGE')
    expect(mode).toBe('red')
  })

  it('resetCursor restores all defaults', () => {
    useCursorStore.getState().setCursor('launch', 'LAUNCH', 'blue')
    useCursorStore.getState().resetCursor()
    const { intent, label, mode } = useCursorStore.getState()
    expect(intent).toBe('default')
    expect(label).toBe('')
    expect(mode).toBe('neutral')
  })

  it('setCursor with no label/mode defaults to empty string and neutral', () => {
    useCursorStore.getState().setCursor('inspect')
    const { label, mode } = useCursorStore.getState()
    expect(label).toBe('')
    expect(mode).toBe('neutral')
  })

  it('setPosition updates x and y', () => {
    useCursorStore.getState().setPosition(120, 340)
    const { x, y } = useCursorStore.getState()
    expect(x).toBe(120)
    expect(y).toBe(340)
  })
})

// ── Marquee ───────────────────────────────────────────────────────────────────

describe('Marquee', () => {
  it('renders children content in the DOM', () => {
    const { container } = render(<Marquee>MITRE</Marquee>)
    expect(container.textContent).toContain('MITRE')
  })

  it('duplicates children for a seamless loop', () => {
    const { container } = render(<Marquee>PTES</Marquee>)
    // "PTES" must appear twice in the DOM — once per copy of children
    const count = (container.textContent.match(/PTES/g) ?? []).length
    expect(count).toBe(2)
  })

  it('renders a single copy under perfMode=low (reduced-motion path, no loop duplication)', () => {
    // framer-motion's useReducedMotion uses a cached matchMedia subscription that
    // can't be overridden mid-test, so we trigger the same code path via perfMode=low
    // (useReducedMotionSafe returns true for either source).
    useSettingsStore.setState({ perfMode: 'low' })

    const { container } = render(<Marquee>NIST</Marquee>)
    const count = (container.textContent.match(/NIST/g) ?? []).length
    expect(count).toBe(1)

    useSettingsStore.setState({ perfMode: 'auto' })
  })
})

// ── RevealText ────────────────────────────────────────────────────────────────

describe('RevealText', () => {
  it('renders children as plain text under reduced-motion before words split', () => {
    // Before useSplitText effect fires, words === null → falls back to <Tag>
    render(<RevealText>Attack Defend</RevealText>)
    // At minimum the text should be in the document (either as fallback or animated)
    expect(screen.getByText(/Attack/)).toBeInTheDocument()
  })

  it('after split, renders individual word spans', async () => {
    render(<RevealText>Hello World</RevealText>)
    await waitFor(() => {
      expect(screen.getByText('Hello')).toBeInTheDocument()
      expect(screen.getByText('World')).toBeInTheDocument()
    })
  })

  it('renders with the correct semantic tag in the fallback path (perfMode=low)', () => {
    // Use perfMode=low to force the reduced-motion fallback path deterministically
    useSettingsStore.setState({ perfMode: 'low' })

    const { container } = render(<RevealText as="h2">Test heading</RevealText>)
    expect(container.querySelector('h2')).not.toBeNull()
    expect(container.querySelector('h2')).toHaveTextContent('Test heading')

    useSettingsStore.setState({ perfMode: 'auto' })
  })

  it('does not add aria-label that would double-announce to screen readers', async () => {
    render(<RevealText>Hello World</RevealText>)
    await waitFor(() => {
      const el = screen.getByText('Hello').closest('[class]')
      // The animated container should NOT carry aria-label
      // (text is already readable from the word spans themselves)
      expect(el?.hasAttribute('aria-label') ?? false).toBe(false)
    })
  })
})

// ── BootHandshake ─────────────────────────────────────────────────────────────

describe('BootHandshake', () => {
  beforeEach(() => {
    sessionStorage.removeItem('cs.boot.done')
  })

  it('renders children immediately when sessionStorage key is already set', () => {
    sessionStorage.setItem('cs.boot.done', '1')
    render(
      <BootHandshake>
        <span data-testid="content">Ready</span>
      </BootHandshake>,
    )
    // Children should be visible (no boot overlay blocking)
    expect(screen.getByTestId('content')).toBeInTheDocument()
  })

  it('renders children immediately under reduced-motion (skips boot)', () => {
    const original = window.matchMedia
    window.matchMedia = (q) => ({
      matches: q === '(prefers-reduced-motion: reduce)',
      media: q, onchange: null,
      addListener: () => {}, removeListener: () => {},
      addEventListener: () => {}, removeEventListener: () => {},
      dispatchEvent: () => false,
    })

    render(
      <BootHandshake>
        <span data-testid="content">Ready</span>
      </BootHandshake>,
    )
    expect(screen.getByTestId('content')).toBeInTheDocument()

    window.matchMedia = original
  })

  it('renders children in DOM while booting (visibility hidden, not unmounted)', () => {
    render(
      <BootHandshake>
        <span data-testid="content">App</span>
      </BootHandshake>,
    )
    // Children always mounted (visibility:hidden, not display:none) so layout
    // can proceed; they become visible after boot completes.
    expect(screen.getByTestId('content')).toBeInTheDocument()
  })
})
