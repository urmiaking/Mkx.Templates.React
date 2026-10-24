import { render, screen } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { MemoryRouter } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { externalOidcApi } from './externalOidc.api'
import { LoginPage } from './LoginPage'

vi.mock('./auth.api', () => ({ authApi: { login: vi.fn() } }))
vi.mock('./passkeys', () => ({ supportsPasskeys: () => false, signInWithPasskey: vi.fn() }))
vi.mock('./externalOidc.api', () => ({
  externalOidcApi: { config: vi.fn(async () => ({ enabled: true, displayName: 'شرکت من' })) }
}))
function mount(path = '/login') {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(<QueryClientProvider client={client}>
    <MemoryRouter initialEntries={[path]}><LoginPage /></MemoryRouter>
  </QueryClientProvider>)
}
describe('optional external OIDC sign-in', () => {
  beforeEach(() => vi.clearAllMocks())
  it('shows navigation to the server-owned OIDC challenge, not a token exchange in React', async () => {
    mount()
    const link = await screen.findByRole('link', { name: 'ورود با شرکت من' })
    expect(link).toHaveAttribute('href', '/api/auth/external/start')
    expect(screen.getByLabelText('نام کاربری')).toBeInTheDocument()
  })
  it('hides the provider when disabled and explains unlinked identities', async () => {
    vi.mocked(externalOidcApi.config).mockResolvedValueOnce({ enabled: false, displayName: 'شرکت من' })
    mount('/login?externalError=not-linked')
    expect(await screen.findByText(/ابتدا با رمز عبور وارد شوید/)).toBeInTheDocument()
    expect(screen.queryByRole('link', { name: /ورود با شرکت من/ })).not.toBeInTheDocument()
  })
})
