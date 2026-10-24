import { useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { Link, useNavigate } from 'react-router-dom'
import { ShieldCheck, KeyRound } from 'lucide-react'
import { authApi } from './auth.api'
import { Button } from '../../shared/ui/Button'
import { Card } from '../../shared/ui/Card'
import { Field, TextInput } from '../../shared/ui/Form'
import { OtpField } from '../../shared/ui/OtpField'

export function TwoFactorPage() {
  const [code, setCode] = useState('')
  const [backup, setBackup] = useState(false)
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const verify = useMutation({
    mutationFn: () => authApi.twoFactor(code, backup),
    onSuccess: async () => {
      await queryClient.invalidateQueries({queryKey:['session']})
      navigate('/', {replace:true})
    }
  })
  return <div className="login-wrap motion-enter"><Card className="login-card">
    <div className="feature-icon"><ShieldCheck size={24}/></div>
    <h1>تأیید دومرحله‌ای ورود</h1>
    <p className="muted">کد برنامه Authenticator را وارد کنید تا ورود شما تکمیل شود.</p>
    <form onSubmit={event => {event.preventDefault(); verify.mutate()}}>
      {backup ? <Field label="کد بازیابی" required>{f => <TextInput id={f.id} value={code} dir="ltr"
        autoComplete="one-time-code" onChange={e => setCode(e.target.value)} required/>}</Field> :
        <><label>کد شش‌رقمی برنامه</label>
        <OtpField value={code} onChange={setCode} label="کد تأیید دومرحله‌ای" disabled={verify.isPending} autoFocus/></>}
      {verify.isError && <p role="alert" className="error">کد نامعتبر است یا مهلت ورود تمام شده. دوباره تلاش کنید.</p>}
      <Button className="full-width" type="submit" disabled={verify.isPending || (backup ? !code : code.length !== 6)}>
        {verify.isPending ? 'در حال تأیید...' : 'تأیید و ورود'}
      </Button>
    </form>
    <button className="mfa-switch-method" type="button" onClick={() => {setBackup(v => !v);setCode('');verify.reset()}}>
      <KeyRound size={16}/>{backup ? 'استفاده از Authenticator' : 'استفاده از کد بازیابی'}
    </button>
    <Link className="account-back-link" to="/login">بازگشت به ورود با رمز عبور</Link>
  </Card></div>
}
