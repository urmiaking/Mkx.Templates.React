import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { authApi } from './auth.api'
import { TwoFactorPage } from './TwoFactorPage'

vi.mock('./auth.api', () => ({authApi:{
  twoFactor: vi.fn(async () => undefined)
}}))
function mount() {
  const queryClient = new QueryClient({defaultOptions:{queries:{retry:false}}})
  return render(<QueryClientProvider client={queryClient}>
    <MemoryRouter initialEntries={['/login/2fa']}><Routes>
      <Route path="/login/2fa" element={<TwoFactorPage/>}/>
      <Route path="/" element={<p>ورود موفق</p>}/>
    </Routes></MemoryRouter>
  </QueryClientProvider>)
}
describe('two-factor sign in', () => {
  beforeEach(() => vi.clearAllMocks())
  it('accepts Persian OTP and finishes the sign in', async () => {
    mount()
    fireEvent.paste(screen.getByRole('textbox',{name:'رقم 1 از 6'}),{clipboardData:{getData:()=> '۱۲۳۴۵۶'}})
    fireEvent.click(screen.getByRole('button',{name:'تأیید و ورود'}))
    await waitFor(() => expect(authApi.twoFactor).toHaveBeenCalledWith('123456',false))
    expect(await screen.findByText('ورود موفق')).toBeInTheDocument()
  })
  it('supports one-time recovery codes', async () => {
    mount()
    fireEvent.click(screen.getByRole('button',{name:/استفاده از کد بازیابی/}))
    fireEvent.change(screen.getByRole('textbox',{name:'کد بازیابی'}),{target:{value:'abcd-efgh'}})
    fireEvent.click(screen.getByRole('button',{name:'تأیید و ورود'}))
    await waitFor(() => expect(authApi.twoFactor).toHaveBeenCalledWith('abcd-efgh',true))
  })
})
