import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { ToastProvider } from '../../shared/ui/ToastProvider'
import { passkeyApi, registerPasskey } from '../auth/passkeys'
import { PasskeySettings } from './PasskeySettings'

vi.mock('../auth/passkeys', () => ({
  supportsPasskeys: () => true,
  registerPasskey: vi.fn(async () => undefined),
  passkeyApi: {
    list: vi.fn(async () => [{ credentialId:'AQID', name:'Laptop', createdAt:'2026-10-24T08:00:00Z', isBackedUp:true }]),
    remove: vi.fn(async () => undefined)
  }
}))

function mount() {
  const client = new QueryClient({defaultOptions:{queries:{retry:false}}})
  return render(<QueryClientProvider client={client}><ToastProvider><PasskeySettings/></ToastProvider></QueryClientProvider>)
}
describe('Passkey account management', () => {
  beforeEach(() => vi.clearAllMocks())
  it('requires the current password before enrollment and submits a friendly name', async () => {
    mount()
    expect(await screen.findByText('Laptop')).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button',{name:'افزودن Passkey'}))
    fireEvent.change(screen.getByRole('textbox',{name:'نام دلخواه برای این دستگاه'}),{target:{value:'Office key'}})
    const password = screen.getByLabelText(/رمز عبور فعلی/)
    fireEvent.change(password,{target:{value:'Strong-Passkey-Test-123!'}})
    fireEvent.click(screen.getByRole('button',{name:'ثبت کلید عبور'}))
    await waitFor(() => expect(registerPasskey).toHaveBeenCalledWith('Strong-Passkey-Test-123!','Office key'))
  })

  it('confirms deletion with a password and sends the selected credential id', async () => {
    mount()
    fireEvent.click(await screen.findByRole('button',{name:'حذف Laptop'}))
    fireEvent.change(screen.getByLabelText(/رمز عبور فعلی/),{target:{value:'Strong-Passkey-Test-123!'}})
    fireEvent.click(screen.getByRole('button',{name:'حذف این Passkey'}))
    await waitFor(() => expect(passkeyApi.remove).toHaveBeenCalledWith('AQID','Strong-Passkey-Test-123!'))
  })
})
