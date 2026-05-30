import { render, screen } from '@testing-library/react'
import { describe, it, expect } from 'vitest'
import Button from '../components/ui/Button'

describe('Button', () => {
  it('renders children', () => {
    render(<Button>Click me</Button>)
    expect(screen.getByText('Click me')).toBeInTheDocument()
  })

  it('shows spinner when loading', () => {
    render(<Button loading>Save</Button>)
    // Text hidden, spinner visible, button disabled
    const btn = screen.getByRole('button')
    expect(btn).toBeDisabled()
    // The spinner span is a sibling — button should not display the text
    expect(btn.querySelector('.animate-spin')).not.toBeNull()
  })

  it('is disabled when disabled prop is set', () => {
    render(<Button disabled>Go</Button>)
    expect(screen.getByRole('button')).toBeDisabled()
  })

  it('renders leftIcon and children together', () => {
    render(<Button leftIcon={<span data-testid="icon" />}>Label</Button>)
    const btn = screen.getByRole('button')
    const icon = screen.getByTestId('icon')
    // Icon is a child of the button and appears before the text
    expect(btn).toContainElement(icon)
    expect(screen.getByText('Label')).toBeInTheDocument()
    // Icon node comes before the text node in DOM order
    const iconIndex = Array.from(btn.childNodes).indexOf(icon)
    const textNode = Array.from(btn.childNodes).find((n) => n.nodeType === Node.TEXT_NODE && n.textContent.includes('Label'))
    expect(iconIndex).toBeLessThan(Array.from(btn.childNodes).indexOf(textNode))
  })

  it('applies variant class names', () => {
    const { rerender } = render(<Button variant="red">R</Button>)
    expect(screen.getByRole('button').className).toContain('btn-v3-red')

    rerender(<Button variant="ghost">G</Button>)
    expect(screen.getByRole('button').className).toContain('btn-v3-ghost')
  })
})
