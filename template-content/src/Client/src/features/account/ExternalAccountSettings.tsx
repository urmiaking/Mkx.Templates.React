import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useLocation } from 'react-router-dom'
import { Link2, Unlink } from 'lucide-react'
import { externalOidcApi } from '../auth/externalOidc.api'
import { Button } from '../../shared/ui/Button'
import { Card } from '../../shared/ui/Card'
import { useToast } from '../../shared/ui/useToast'

const messages: Record<string, string> = {
  linked: 'حساب خارجی با موفقیت متصل شد.',
  'already-linked': 'یک حساب خارجی قبلاً متصل شده است.',
  unavailable: 'این هویت خارجی قبلاً به حساب دیگری متصل شده است.',
  'invalid-password': 'رمز عبور فعلی درست نیست.',
  failed: 'اتصال حساب خارجی انجام نشد. دوباره تلاش کنید.'
}

export function ExternalAccountSettings() {
  const [password, setPassword] = useState('')
  const location = useLocation()
  const queryClient = useQueryClient()
  const toast = useToast()
  const status = useQuery({ queryKey: ['account', 'external'], queryFn: externalOidcApi.status })
  const csrf = useQuery({
    queryKey: ['auth', 'csrf', 'external-link'],
    queryFn: externalOidcApi.csrf,
    enabled: status.data?.enabled === true && status.data?.linked !== true,
    staleTime: 0
  })
  const unlink = useMutation({
    mutationFn: () => externalOidcApi.unlink(password),
    onSuccess: async () => {
      setPassword('')
      await queryClient.invalidateQueries({ queryKey: ['account', 'external'] })
      toast.show('اتصال حساب خارجی حذف شد.', 'success')
    }
  })
  const feedback = messages[new URLSearchParams(location.search).get('external') ?? '']
  if (status.isPending) return <Card className="account-card"><p role="status">در حال بررسی حساب خارجی...</p></Card>
  if (status.isError) return <Card className="account-card"><p role="alert" className="error">وضعیت حساب خارجی دریافت نشد.</p></Card>
  if (!status.data.enabled && !status.data.linked) return null

  return <Card className="account-card">
    <div className="account-card-heading"><span className="account-icon"><Link2 size={22}/></span>
      <div><h2>حساب خارجی</h2><p className="muted">اتصال امن با {status.data.displayName}؛ بدون انتقال نقش‌ها و دسترسی‌های خارجی.</p></div>
    </div>
    {feedback && <p role="status" className={new URLSearchParams(location.search).get('external') === 'linked' ? 'muted' : 'error'}>{feedback}</p>}
    <p className="muted">{status.data.linked ? 'این حساب به ارائه‌دهنده خارجی متصل است.' : 'برای اتصال، ابتدا رمز عبور فعلی را تأیید کنید.'}</p>
    {status.data.linked ? <form className="account-form" onSubmit={event => {
      event.preventDefault()
      if (password) unlink.mutate()
    }}>
      <label htmlFor="external-unlink-password">رمز عبور فعلی</label>
      <input id="external-unlink-password" type="password" dir="ltr" autoComplete="current-password" value={password}
        onChange={event => setPassword(event.target.value)} required />
      <div className="account-actions"><Button variant="secondary" type="submit" disabled={unlink.isPending}>
        <Unlink size={16}/> {unlink.isPending ? 'در حال حذف...' : 'قطع اتصال'}
      </Button></div>
      {unlink.isError && <p role="alert" className="error">قطع اتصال انجام نشد؛ رمز عبور را بررسی کنید.</p>}
    </form> : status.data.enabled && <form className="account-form" method="post" action="/api/account/external/link">
      <input type="hidden" name="__RequestVerificationToken" value={csrf.data?.token ?? ''} />
      <label htmlFor="external-link-password">رمز عبور فعلی</label>
      <input id="external-link-password" name="currentPassword" type="password" dir="ltr" autoComplete="current-password" required />
      <div className="account-actions"><Button type="submit" disabled={!csrf.data?.token || csrf.isError}>
        <Link2 size={16}/> اتصال به {status.data.displayName}
      </Button></div>
      {csrf.isError && <p role="alert" className="error">دریافت توکن امنیتی انجام نشد؛ صفحه را تازه‌سازی کنید.</p>}
    </form>}
  </Card>
}
