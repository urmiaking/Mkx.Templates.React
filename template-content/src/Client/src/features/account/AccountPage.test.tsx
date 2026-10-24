import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { ToastProvider } from '../../shared/ui/ToastProvider'
import { accountApi } from './account.api'
import { AccountPage } from './AccountPage'

vi.mock('./PasskeySettings', () => ({ PasskeySettings: () => <div>Passkeys</div> }))
vi.mock('./ExternalAccountSettings', () => ({ ExternalAccountSettings: () => null }))
vi.mock('./mfa.api', () => ({mfaApi:{status:vi.fn(async()=>({enabled:false,recoveryCodesLeft:0}))}}))
vi.mock('./account.api', () => ({
  accountApi: {
    profile: vi.fn(async () => ({ userName: 'member', email: 'member@example.com', emailConfirmed: false })),
    updateProfile: vi.fn(async (userName: string, email: string) => ({userName, email, emailConfirmed: false})),
    sendVerification: vi.fn(async () => {}),
    changePassword: vi.fn(async () => {})
  }
}))
function mount() {
  const queryClient = new QueryClient({defaultOptions:{queries:{retry:false}}})
  return render(<QueryClientProvider client={queryClient}><ToastProvider><AccountPage/></ToastProvider></QueryClientProvider>)
}
describe('AccountPage', () => {
  beforeEach(() => vi.clearAllMocks())
  it('shows editable self profile and requests a verification link', async () => {
    mount()
    expect(await screen.findByRole('heading', {name:'پروفایل و امنیت'})).toBeInTheDocument()
    expect(screen.getByRole('textbox', {name:/نام کاربری/})).toHaveValue('member')
    fireEvent.click(screen.getByRole('button', {name:'ارسال پیوند تأیید'}))
    await waitFor(() => expect(accountApi.sendVerification).toHaveBeenCalledOnce())
    fireEvent.change(screen.getByRole('textbox', {name:/نام کاربری/}), {target:{value:'member-updated'}})
    fireEvent.click(screen.getByRole('button', {name:'ذخیره تغییرات'}))
    await waitFor(() => expect(accountApi.updateProfile).toHaveBeenCalledWith('member-updated','member@example.com'))
  })
  it('rejects mismatched password confirmation before hitting API', async () => {
    mount()
    await screen.findByRole('heading', {name:'تغییر رمز عبور'})
    const passwords = screen.getAllByLabelText(/رمز عبور/)
    fireEvent.change(passwords[0], {target:{value:'old'}})
    fireEvent.change(passwords[1], {target:{value:'Strong-Testing-123!'}})
    fireEvent.change(passwords[2], {target:{value:'Mismatch-Testing-123!'}})
    fireEvent.click(screen.getByRole('button',{name:'تغییر رمز عبور'}))
    expect(await screen.findByText('تکرار رمز با رمز جدید یکسان نیست.')).toBeInTheDocument()
    expect(accountApi.changePassword).not.toHaveBeenCalled()
  })
})
