import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { ToastProvider } from '../../shared/ui/ToastProvider'
import { mfaApi } from './mfa.api'
import { MfaSettings } from './MfaSettings'

vi.mock('./mfa.api', () => ({mfaApi:{
  status: vi.fn(async () => ({enabled:false,recoveryCodesLeft:0})),
  setup: vi.fn(async () => ({sharedKey:'TESTKEYABC',authenticatorUri:'otpauth://totp/Mkx%3Amember?secret=TESTKEYABC'})),
  enable: vi.fn(async () => ({codes:['first-code','second-code']})),
  regenerate: vi.fn(async () => ({codes:['third-code']})),
  disable: vi.fn(async () => undefined)
}}))
function mount() {
  const queryClient = new QueryClient({defaultOptions:{queries:{retry:false}}})
  return render(<QueryClientProvider client={queryClient}><ToastProvider><MfaSettings/></ToastProvider></QueryClientProvider>)
}
describe('MFA settings', () => {
  beforeEach(() => vi.clearAllMocks())
  it('requires password before QR setup and displays recovery codes once', async () => {
    mount()
    fireEvent.click(await screen.findByRole('button',{name:'راه‌اندازی Authenticator'}))
    fireEvent.change(screen.getByLabelText(/رمز عبور فعلی/),{target:{value:'Strong-Testing-123!'}})
    fireEvent.click(screen.getByRole('button',{name:'ادامه'}))
    expect(await screen.findByText('TESTKEYABC')).toBeInTheDocument()
    await waitFor(() => expect(mfaApi.setup).toHaveBeenCalledWith('Strong-Testing-123!'))
    fireEvent.paste(screen.getByRole('textbox',{name:'رقم 1 از 6'}),{clipboardData:{getData:()=> '۱۲۳۴۵۶'}})
    fireEvent.click(screen.getByRole('button',{name:'تأیید و فعال‌سازی'}))
    await waitFor(() => expect(mfaApi.enable).toHaveBeenCalledWith('Strong-Testing-123!','123456'))
    expect(await screen.findByText('first-code')).toBeInTheDocument()
    expect(screen.getByText('second-code')).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button',{name:'کدها را ذخیره کردم'}))
    expect(screen.queryByText('first-code')).not.toBeInTheDocument()
  })
})
