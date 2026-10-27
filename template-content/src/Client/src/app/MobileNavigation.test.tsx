import { fireEvent, render, screen } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { MemoryRouter } from 'react-router-dom'
import { describe, expect, it, vi } from 'vitest'
import { App } from './App'
import { MobileNavigation } from './MobileNavigation'

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

describe('mobile bottom bar', () => {
  const base = {
    authenticated: false,
    canViewWorkItems: false,
    canManageWorkItems: false,
    canViewUsers: false,
    mode: 'light' as const,
    onToggleTheme: vi.fn(),
    onOpenMenu: vi.fn()
  }

  it('offers guest navigation without showing privileged actions', () => {
    render(<MemoryRouter><MobileNavigation {...base}/></MemoryRouter>)
    const nav = screen.getByRole('navigation', { name: 'ناوبری موبایل' })
    expect(nav).toHaveTextContent('خانه')
    expect(nav).toHaveTextContent('اجزای UI')
    expect(nav).toHaveTextContent('ورود')
    expect(nav).not.toHaveTextContent('ثبت جدید')
    expect(nav).not.toHaveTextContent('کاربران')
    expect(screen.getByRole('link', { name: 'ورود' })).toHaveAttribute('href', '/login')
    fireEvent.click(screen.getByRole('button', { name: 'باز کردن منوی اصلی' }))
    expect(base.onOpenMenu).toHaveBeenCalledOnce()
  })

  it('uses real create navigation and permission-controlled destinations', () => {
    render(<MemoryRouter><MobileNavigation {...base} authenticated
      canViewWorkItems canManageWorkItems canViewUsers/></MemoryRouter>)
    expect(screen.getByRole('link', { name: 'ثبت جدید' }))
      .toHaveAttribute('href', '/work-items?create=1')
    expect(screen.getByRole('link', { name: 'کاربران' })).toHaveAttribute('href', '/users')
    expect(screen.getByRole('link', { name: 'حساب من' })).toHaveAttribute('href', '/account')
    expect(screen.queryByRole('button', { name: 'باز کردن منوی اصلی' })).not.toBeInTheDocument()
  })

  it('keeps the central account shortcut when creation is not allowed', () => {
    render(<MemoryRouter><MobileNavigation {...base} authenticated
      canViewWorkItems/></MemoryRouter>)
    expect(screen.getByRole('link', { name: 'حساب من' })).toHaveAttribute('href', '/account')
    expect(screen.queryByRole('link', { name: 'ثبت جدید' })).not.toBeInTheDocument()
    expect(screen.queryByRole('link', { name: 'کاربران' })).not.toBeInTheDocument()
  })
})
