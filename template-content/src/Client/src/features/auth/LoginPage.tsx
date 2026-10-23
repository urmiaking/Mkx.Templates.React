import { useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import { LockKeyhole, ArrowLeft } from 'lucide-react'
import { authApi } from './auth.api'
import { ApiError } from '../../shared/api/http'
import { Button } from '../../shared/ui/Button'
import { Card } from '../../shared/ui/Card'

export function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const queryClient = useQueryClient()
  const navigate = useNavigate()
  const signIn = useMutation({
    mutationFn: () => authApi.login(email, password),
    onSuccess: async () => { await queryClient.invalidateQueries({ queryKey: ['session'] }); navigate('/work-items') }
  })

  return <div className="login-wrap motion-enter">
    <Card className="login-card">
      <div className="feature-icon"><LockKeyhole size={24} /></div>
      <h1>ورود به فضای کار</h1>
      <p className="muted">برای مدیریت اطلاعات، با حساب کاربری خود وارد شوید.</p>
      <form onSubmit={event => { event.preventDefault(); signIn.mutate() }}>
        <label htmlFor="email">ایمیل</label>
        <input id="email" dir="ltr" type="email" required autoComplete="username" value={email} onChange={event => setEmail(event.target.value)} />
        <label htmlFor="password">رمز عبور</label>
        <input id="password" dir="ltr" type="password" required autoComplete="current-password" value={password} onChange={event => setPassword(event.target.value)} />
        {signIn.isError && <p role="alert" className="error">{signIn.error instanceof ApiError && signIn.error.status === 401 ? 'اطلاعات ورود صحیح نیست.' : signIn.error.message}</p>}
        <Button type="submit" disabled={signIn.isPending} className="full-width">
          {signIn.isPending ? 'در حال ورود...' : 'ورود به سیستم'} <ArrowLeft size={17}/>
        </Button>
      </form>
    </Card>
  </div>
}
