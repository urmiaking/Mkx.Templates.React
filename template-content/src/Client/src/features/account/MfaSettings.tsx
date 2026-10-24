import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { ShieldCheck, ShieldAlert, RefreshCw, Copy, Smartphone, KeyRound } from 'lucide-react'
import { QRCodeSVG } from 'qrcode.react'
import { mfaApi } from './mfa.api'
import type { MfaSetup } from './mfa.api'
import { Button } from '../../shared/ui/Button'
import { Card } from '../../shared/ui/Card'
import { Dialog } from '../../shared/ui/Dialog'
import { Field, TextInput } from '../../shared/ui/Form'
import { OtpField } from '../../shared/ui/OtpField'
import { useToast } from '../../shared/ui/useToast'

type Action = 'disable' | 'regenerate' | null

export function MfaSettings() {
  const [setupOpen, setSetupOpen] = useState(false)
  const [setupData, setSetupData] = useState<MfaSetup | null>(null)
  const [setupPassword, setSetupPassword] = useState('')
  const [setupCode, setSetupCode] = useState('')
  const [action, setAction] = useState<Action>(null)
  const [actionPassword, setActionPassword] = useState('')
  const [actionCode, setActionCode] = useState('')
  const [useBackup, setUseBackup] = useState(false)
  const [recoveryCodes, setRecoveryCodes] = useState<string[]>([])
  const queryClient = useQueryClient()
  const toast = useToast()
  const status = useQuery({queryKey:['mfa','status'],queryFn:mfaApi.status})

  const setup = useMutation({
    mutationFn: () => mfaApi.setup(setupPassword),
    onSuccess: result => setSetupData(result)
  })
  const enable = useMutation({
    mutationFn: () => mfaApi.enable(setupPassword, setupCode),
    onSuccess: async result => {
      setRecoveryCodes(result.codes)
      closeSetup()
      await queryClient.invalidateQueries({queryKey:['mfa','status']})
      toast.show('تأیید دومرحله‌ای فعال شد. کدهای بازیابی را نگه دارید.', 'success')
    }
  })
  const modify = useMutation({
    mutationFn: async () => {
      if (action === 'disable') { await mfaApi.disable(actionPassword, actionCode); return undefined }
      return mfaApi.regenerate(actionPassword, actionCode)
    },
    onSuccess: async result => {
      const completed = action
      closeAction()
      if (completed === 'regenerate' && result) setRecoveryCodes(result.codes)
      await queryClient.invalidateQueries({queryKey:['mfa','status']})
      toast.show(completed === 'disable' ? 'تأیید دومرحله‌ای غیرفعال شد.' : 'کدهای بازیابی قبلی باطل شدند.', 'success')
    }
  })
  function closeSetup() {
    setSetupOpen(false); setSetupData(null); setSetupPassword(''); setSetupCode('')
    setup.reset(); enable.reset()
  }
  function closeAction() {
    setAction(null); setActionPassword(''); setActionCode(''); setUseBackup(false); modify.reset()
  }
  function beginAction(next: Exclude<Action, null>) {
    closeAction()
    setAction(next)
  }
  async function copyCodes() {
    try {
      await navigator.clipboard.writeText(recoveryCodes.join('\n'))
      toast.show('کدهای بازیابی کپی شدند.', 'success')
    } catch { toast.show('دسترسی به کلیپ‌بورد فراهم نیست. کدها را دستی ذخیره کنید.', 'error') }
  }

  return <Card className="account-card account-mfa">
    <div className="account-card-heading"><span className="account-icon"><ShieldCheck size={22}/></span>
      <div><h2>تأیید دومرحله‌ای</h2><p className="muted">امنیت ورود با برنامه Authenticator و کدهای بازیابی</p></div>
      <span className={'mfa-badge ' + (status.data?.enabled ? 'mfa-badge--active' : '')}>
        {status.isPending ? 'در حال بررسی' : status.data?.enabled ? 'فعال' : 'غیرفعال'}
      </span>
    </div>
    {status.isError ? <p role="alert" className="error">دریافت وضعیت امنیت حساب ممکن نیست.</p> :
      status.data?.enabled ? <div className="mfa-state">
        <div className="mfa-state-info"><ShieldCheck size={24}/><div><strong>حساب شما محافظت می‌شود</strong>
          <p className="muted">هنگام ورود، علاوه بر رمز عبور کد Authenticator نیاز است. {status.data.recoveryCodesLeft} کد بازیابی باقی مانده است.</p></div></div>
        <div className="mfa-buttons">
          <Button variant="secondary" onClick={() => beginAction('regenerate')}><RefreshCw size={17}/>کدهای بازیابی جدید</Button>
          <Button variant="danger" onClick={() => beginAction('disable')}><ShieldAlert size={17}/>غیرفعال‌سازی</Button>
        </div>
      </div> : !status.isPending && <div className="mfa-state">
        <p className="muted">با Google Authenticator، Microsoft Authenticator یا برنامه سازگار، یک لایه امنیتی به حساب اضافه کنید.</p>
        <Button onClick={() => setSetupOpen(true)}><Smartphone size={17}/>راه‌اندازی Authenticator</Button>
      </div>}

    <Dialog open={setupOpen} onOpenChange={value => {if (!value) closeSetup(); else setSetupOpen(true)}}
      title="فعال‌سازی تأیید دومرحله‌ای" description="ابتدا رمز عبور حساب خود را تأیید کنید." size="md">
      <div className="mfa-dialog-content">
        {!setupData ? <form className="account-form" onSubmit={event => {event.preventDefault(); setup.mutate()}}>
          <Field label="رمز عبور فعلی" required>{f => <TextInput id={f.id} dir="ltr" type="password" autoComplete="current-password"
            value={setupPassword} onChange={e => setSetupPassword(e.target.value)} required/>}</Field>
          {setup.isError && <p className="error" role="alert">رمز عبور درست نیست یا حساب اجازه فعال‌سازی ندارد.</p>}
          <Button type="submit" disabled={setup.isPending || !setupPassword}>ادامه</Button>
        </form> : <>
          <p className="muted">کد QR را با برنامه Authenticator اسکن کنید، یا کلید زیر را دستی وارد کنید.</p>
          <div className="mfa-qr" dir="ltr"><QRCodeSVG value={setupData.authenticatorUri} size={180} level="M" marginSize={1}/></div>
          <div className="mfa-secret" dir="ltr"><code>{setupData.sharedKey}</code>
            <Button variant="ghost" type="button" onClick={() => void navigator.clipboard?.writeText(setupData.sharedKey)} aria-label="کپی کلید"><Copy size={16}/></Button></div>
          <form className="account-form" onSubmit={event => {event.preventDefault(); enable.mutate()}}>
            <label className="ui-field__label">کد شش‌رقمی برنامه</label>
            <OtpField value={setupCode} onChange={setSetupCode} disabled={enable.isPending} label="کد راه‌اندازی"/>
            {enable.isError && <p role="alert" className="error">کد یا رمز عبور معتبر نیست. ساعت گوشی را بررسی کنید.</p>}
            <Button type="submit" disabled={setupCode.length !== 6 || enable.isPending}>تأیید و فعال‌سازی</Button>
          </form>
        </>}
      </div>
    </Dialog>

    <Dialog open={action !== null} onOpenChange={open => {if (!open) closeAction()}}
      title={action === 'disable' ? 'غیرفعال‌سازی تأیید دومرحله‌ای' : 'تولید کدهای بازیابی جدید'}
      description={action === 'disable' ? 'با این کار امنیت ورود حساب کاهش می‌یابد.' : 'کدهای قبلی بلافاصله بی‌اعتبار می‌شوند.'}>
      <form className="account-form mfa-dialog-content" onSubmit={event => {event.preventDefault(); modify.mutate()}}>
        <Field label="رمز عبور فعلی" required>{f => <TextInput id={f.id} dir="ltr" type="password" autoComplete="current-password"
          value={actionPassword} onChange={e => setActionPassword(e.target.value)} required/>}</Field>
        <label className="ui-check"><input type="checkbox" checked={useBackup} onChange={e => {setUseBackup(e.target.checked);setActionCode('')}}/>
          <span>استفاده از کد بازیابی به‌جای کد Authenticator</span></label>
        {useBackup ? <Field label="کد بازیابی" required>{f => <TextInput id={f.id} dir="ltr" autoComplete="off"
          value={actionCode} onChange={e => setActionCode(e.target.value)} required/>}</Field> :
          <><label className="ui-field__label">کد شش‌رقمی Authenticator</label>
          <OtpField value={actionCode} onChange={setActionCode} disabled={modify.isPending}/></>}
        {modify.isError && <p role="alert" className="error">رمز عبور یا کد تأیید نادرست است.</p>}
        <Button variant={action === 'disable' ? 'danger' : 'primary'} type="submit"
          disabled={modify.isPending || !actionPassword || (useBackup ? !actionCode : actionCode.length !== 6)}>
          {action === 'disable' ? 'غیرفعال‌سازی امن' : 'تولید کدهای جدید'}</Button>
      </form>
    </Dialog>

    <Dialog open={recoveryCodes.length > 0} onOpenChange={open => {if (!open) setRecoveryCodes([])}}
      title="کدهای بازیابی یک‌بارمصرف" description="این کدها فقط همین حالا نمایش داده می‌شوند. آن‌ها را در جای امنی ذخیره کنید." size="md"
      footer={<Button onClick={() => setRecoveryCodes([])}>کدها را ذخیره کردم</Button>}>
      <div className="mfa-recovery-list" dir="ltr">{recoveryCodes.map(code => <code key={code}>{code}</code>)}</div>
      <Button variant="secondary" onClick={() => void copyCodes()}><Copy size={16}/>کپی همه کدها</Button>
      <p className="muted mfa-recovery-warning"><KeyRound size={16}/> هر کد فقط برای یک ورود قابل استفاده است. تولید مجدد، کدهای قبلی را باطل می‌کند.</p>
    </Dialog>
  </Card>
}
