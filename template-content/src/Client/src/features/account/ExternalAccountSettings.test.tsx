import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { MemoryRouter } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { ToastProvider } from '../../shared/ui/ToastProvider'
import { externalOidcApi } from '../auth/externalOidc.api'
import { ExternalAccountSettings } from './ExternalAccountSettings'

vi.mock('../auth/externalOidc.api', () => ({
  externalOidcApi: {
    status: vi.fn(async () => ({ enabled: true, displayName: 'شرکت من', linked: false })),
    csrf: vi.fn(async () => ({ token: 'verified-csrf-token' })),
    unlink: vi.fn(async () => undefined)
  }
}))
function mount() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(<QueryClientProvider client={client}>
    <ToastProvider><MemoryRouter><ExternalAccountSettings /></MemoryRouter></ToastProvider>
  </QueryClientProvider>)
}
describe('external OIDC account management', () => {
  beforeEach(() => vi.clearAllMocks())
  it('uses a full-page form POST with an antiforgery field before linking', async () => {
    mount()
    const link = await screen.findByRole('button', { name: /اتصال به شرکت من/ })
    await waitFor(() => expect(link).toBeEnabled())
    const form = link.closest('form')
    expect(form).toHaveAttribute('action', '/api/account/external/link')
    expect(form).toHaveAttribute('method', 'post')
    expect(form?.querySelector('input[name="__RequestVerificationToken"]')).toHaveValue('verified-csrf-token')
    expect(screen.getByLabelText('رمز عبور فعلی')).toBeRequired()
  })
  it('requires the current password to unlink an existing provider identity', async () => {
    vi.mocked(externalOidcApi.status).mockResolvedValueOnce({ enabled: true, displayName: 'شرکت من', linked: true })
    mount()
    const field = await screen.findByLabelText('رمز عبور فعلی')
    fireEvent.change(field, { target: { value: 'Testing-Password' } })
    fireEvent.click(screen.getByRole('button', { name: 'قطع اتصال' }))
    await waitFor(() => expect(externalOidcApi.unlink).toHaveBeenCalledWith('Testing-Password'))
  })
})
