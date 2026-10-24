import { render, screen } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { MemoryRouter } from 'react-router-dom'
import { describe, expect, it, vi } from 'vitest'
import { App } from './App'

vi.mock('../features/auth/auth.api', () => ({
  authApi: { me: vi.fn().mockResolvedValue({ authenticated: false, permissions: [] }) }
}))
vi.mock('../features/auth/externalOidc.api', () => ({
  externalOidcApi: { config: vi.fn().mockResolvedValue({ enabled: false }) }
}))

function renderRoute(pathname: string) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(<QueryClientProvider client={client}>
    <MemoryRouter initialEntries={[pathname]}><App/></MemoryRouter>
  </QueryClientProvider>)
}

describe('standalone identity routes', () => {
  it('renders login independently of the workspace sidebar and header', async () => {
    const { container } = renderRoute('/login')
    expect(await screen.findByRole('heading', { name: 'ورود به فضای کار' })).toBeInTheDocument()
    expect(container.querySelector('.identity-shell')).toBeInTheDocument()
    expect(container.querySelector('.app-shell')).not.toBeInTheDocument()
    expect(screen.queryByRole('navigation', { name: 'منوی اصلی' })).not.toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'بازگشت به فضای کار' })).toHaveAttribute('href', '/')
    expect(screen.getByRole('button', { name: /تغییر به حالت (روشن|تاریک)/ })).toBeInTheDocument()
  })

  it('keeps password recovery in the independent layout', async () => {
    const { container } = renderRoute('/forgot-password')
    expect(await screen.findByRole('heading', { name: 'بازیابی رمز عبور' })).toBeInTheDocument()
    expect(container.querySelector('.identity-shell')).toBeInTheDocument()
    expect(container.querySelector('.sidebar')).not.toBeInTheDocument()
  })
})
