import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { LockKeyhole, ArrowLeft, Fingerprint, Building2 } from 'lucide-react'
import { authApi } from './auth.api'
import { externalOidcApi } from './externalOidc.api'
import { signInWithPasskey, supportsPasskeys } from './passkeys'
import { ApiError } from '../../shared/api/http'
import { Button } from '../../shared/ui/Button'
import { Card } from '../../shared/ui/Card'

export function LoginPage() {
  const [userName, setUserName] = useState('')
  const [password, setPassword] = useState('')
  const queryClient = useQueryClient()
  const navigate = useNavigate()
  const location = useLocation()
  const external = useQuery({ queryKey: ['auth', 'external-config'], queryFn: externalOidcApi.config })
  const externalError = new URLSearchParams(location.search).get('externalError')
  const signIn = useMutation({
    mutationFn: () => authApi.login(userName, password),
    onSuccess: async result => {
      if (result?.requiresTwoFactor) { navigate('/login/2fa'); return }
      await queryClient.invalidateQueries({ queryKey: ['session'] }); navigate('/')
    }
  })

  const passkeySignIn = useMutation({
    mutationFn: signInWithPasskey,
    onSuccess: async () => { await queryClient.invalidateQueries({ queryKey: ['session'] }); navigate('/') }
  })

  return <div className="login-wrap motion-enter">
    <Card className="login-card">
      <div className="feature-icon"><LockKeyhole size={24} /></div>
      <h1>ورود به فضای کار</h1>
      <p className="muted">برای مدیریت اطلاعات، با حساب کاربری خود وارد شوید.</p>
      <form onSubmit={event => { event.preventDefault(); signIn.mutate() }}>
        <label htmlFor="username">نام کاربری</label>
        <input id="username" dir="ltr" type="text" required autoComplete="username" value={userName} onChange={event => setUserName(event.target.value)} />
        <label htmlFor="password">رمز عبور</label>
        <input id="password" dir="ltr" type="password" required autoComplete="current-password" value={password} onChange={event => setPassword(event.target.value)} />
        {signIn.isError && <p role="alert" className="error">{signIn.error instanceof ApiError && signIn.error.status === 401 ? 'اطلاعات ورود صحیح نیست.' : signIn.error.message}</p>}
        <Button type="submit" disabled={signIn.isPending} className="full-width">
          {signIn.isPending ? 'در حال ورود...' : 'ورود به سیستم'} <ArrowLeft size={17}/>
        </Button>
      </form>
      <div className="passkey-login-divider">یا</div>
      <Button variant="secondary" className="full-width" disabled={!supportsPasskeys() || passkeySignIn.isPending || signIn.isPending}
        onClick={() => passkeySignIn.mutate()}><Fingerprint size={18}/>
        {passkeySignIn.isPending ? 'در انتظار تأیید دستگاه...' : 'ورود با Passkey'}</Button>
      {passkeySignIn.isError && <p role="alert" className="error">{passkeySignIn.error instanceof Error ? passkeySignIn.error.message : 'ورود با Passkey انجام نشد.'}</p>}
      {external.data?.enabled && <><div className="passkey-login-divider">یا</div>
        <a className="button button--secondary full-width" href="/api/auth/external/start"><Building2 size={18}/> ورود با {external.data.displayName}</a></>}
      {externalError && <p role="alert" className="error">{externalError === 'not-linked'
        ? 'این هویت خارجی به هیچ حسابی متصل نیست. ابتدا با رمز عبور وارد شوید و از بخش حساب من اتصال را انجام دهید.'
        : externalError === 'locked' ? 'این حساب موقتاً قفل شده است.' : 'ورود خارجی انجام نشد. دوباره تلاش کنید.'}</p>}
      <Link className="account-back-link" to="/forgot-password">رمز عبور را فراموش کرده‌اید؟</Link>
    </Card>
  </div>
}
