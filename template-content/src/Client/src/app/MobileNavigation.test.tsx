import { fireEvent, render, screen } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { MemoryRouter } from 'react-router-dom'
import { describe, expect, it, vi } from 'vitest'
import { App } from './App'

vi.mock('../features/auth/auth.api', () => ({
  authApi: { me: vi.fn().mockResolvedValue({ authenticated: false, permissions: [] }) }
}))

function renderWorkspace() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(<QueryClientProvider client={client}>
    <MemoryRouter initialEntries={['/']}><App/></MemoryRouter>
  </QueryClientProvider>)
}

describe('mobile navigation drawer', () => {
  it('keeps its backdrop mounted while closing so CSS can animate out', () => {
    const { container } = renderWorkspace()
    const trigger = screen.getByRole('button', { name: 'باز کردن منو' })
    const drawer = container.querySelector('.sidebar')
    const backdrop = container.querySelector('.sidebar-backdrop')

    expect(backdrop).toBeInTheDocument()
    expect(backdrop).toHaveAttribute('data-open', 'false')
    expect(trigger).toHaveAttribute('aria-expanded', 'false')

    fireEvent.click(trigger)
    expect(drawer).toHaveClass('sidebar--open')
    expect(backdrop).toHaveAttribute('data-open', 'true')
    expect(trigger).toHaveAttribute('aria-expanded', 'true')

    fireEvent.click(backdrop!)
    expect(drawer).not.toHaveClass('sidebar--open')
    expect(backdrop).toBeInTheDocument()
    expect(backdrop).toHaveAttribute('data-open', 'false')
    expect(trigger).toHaveAttribute('aria-expanded', 'false')
  })

  it('locks scrolling, focuses the drawer and restores focus on Escape', () => {
    const originalWidth = window.innerWidth
    const originalOverflow = document.body.style.overflow
    Object.defineProperty(window, 'innerWidth', { configurable: true, value: 320 })
    try {
      const { container } = renderWorkspace()
      const trigger = screen.getByRole('button', { name: 'باز کردن منو' })
      fireEvent.click(trigger)

      expect(document.body.style.overflow).toBe('hidden')
      expect(container.querySelector('.sidebar .mobile-only')).toHaveFocus()
      fireEvent.keyDown(document, { key: 'Escape' })
      expect(trigger).toHaveFocus()
      expect(trigger).toHaveAttribute('aria-expanded', 'false')
      expect(document.body.style.overflow).toBe(originalOverflow)
    } finally {
      Object.defineProperty(window, 'innerWidth', { configurable: true, value: originalWidth })
      document.body.style.overflow = originalOverflow
    }
  })
})
