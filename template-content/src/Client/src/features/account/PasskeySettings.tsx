import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Fingerprint, KeyRound, Plus, Trash2, ShieldCheck } from 'lucide-react'
import { passkeyApi, registerPasskey, supportsPasskeys } from '../auth/passkeys'
import type { PasskeySummary } from '../auth/passkeys'
import { Button } from '../../shared/ui/Button'
import { Card } from '../../shared/ui/Card'
import { Dialog } from '../../shared/ui/Dialog'
import { Field, TextInput } from '../../shared/ui/Form'
import { useToast } from '../../shared/ui/useToast'

function explanation(error: unknown) {
  if (error instanceof DOMException && error.name === 'NotAllowedError')
    return 'درخواست Passkey لغو شد یا مهلت تأیید تمام شد.'
  return error instanceof Error ? error.message : 'عملیات Passkey انجام نشد.'
}

export function PasskeySettings() {
  const queryClient = useQueryClient()
  const toast = useToast()
  const keys = useQuery({ queryKey: ['passkeys'], queryFn: passkeyApi.list })
  const [registerOpen, setRegisterOpen] = useState(false)
  const [password, setPassword] = useState('')
  const [name, setName] = useState('')
  const [removing, setRemoving] = useState<PasskeySummary | null>(null)
  const [removePassword, setRemovePassword] = useState('')
  const enabled = supportsPasskeys()

  const register = useMutation({
    mutationFn: () => registerPasskey(password, name.trim() || 'Passkey'),
    onSuccess: async () => {
      setRegisterOpen(false); setPassword(''); setName('')
      await queryClient.invalidateQueries({ queryKey: ['passkeys'] })
      toast.show('Passkey جدید به حساب اضافه شد.', 'success')
    }
  })
  const remove = useMutation({
    mutationFn: () => passkeyApi.remove(removing!.credentialId, removePassword),
    onSuccess: async () => {
      setRemoving(null); setRemovePassword('')
      await queryClient.invalidateQueries({ queryKey: ['passkeys'] })
      toast.show('Passkey حذف شد.', 'success')
    }
  })

  return <Card className="account-card account-passkeys">
    <div className="account-card-heading">
      <span className="account-icon"><Fingerprint size={22}/></span>
      <div><h2>کلیدهای عبور (Passkeys)</h2><p className="muted">ورود امن بدون رمز عبور با Windows Hello، اثرانگشت یا کلید امنیتی</p></div>
      <span className="mfa-badge">{keys.data?.length ?? 0} کلید</span>
    </div>

    {!enabled && <p className="passkey-notice">برای ثبت و ورود با Passkey به مرورگر سازگار و HTTPS (یا localhost) نیاز است.</p>}
    {keys.isPending ? <p className="muted" role="status">در حال دریافت کلیدهای عبور...</p> :
      keys.isError ? <p role="alert" className="error">دریافت Passkeyهای حساب ممکن نیست.</p> :
      keys.data.length ? <ul className="passkey-list">{keys.data.map(key =>
        <li key={key.credentialId} className="passkey-item">
          <span className="passkey-item-icon"><KeyRound size={19}/></span>
          <div className="passkey-item-body">
            <strong>{key.name}</strong>
            <small>ثبت‌شده در {new Intl.DateTimeFormat('fa-IR', {dateStyle:'medium'}).format(new Date(key.createdAt))}
              {key.isBackedUp && <span className="passkey-backed"><ShieldCheck size={13}/>قابل بازیابی در دستگاه دیگر</span>}</small>
          </div>
          <Button variant="ghost" onClick={() => {setRemoving(key);setRemovePassword('')}} aria-label={'حذف ' + key.name}>
            <Trash2 size={17}/></Button>
        </li>
      )}</ul> : <p className="muted passkey-empty">هنوز کلید عبوری ثبت نشده است. با افزودن Passkey می‌توانید دفعه بعد بدون تایپ رمز وارد شوید.</p>}
    <div className="passkey-actions">
      <Button disabled={!enabled || keys.isPending || keys.isError} onClick={() => {register.reset();setRegisterOpen(true)}}>
        <Plus size={17}/>افزودن Passkey</Button>
    </div>

    <Dialog open={registerOpen} onOpenChange={open => {if (!open && !register.isPending){setRegisterOpen(false);setPassword('');setName('');register.reset()}}}
      title="افزودن کلید عبور" description="پس از تأیید رمز فعلی، مرورگر از شما می‌خواهد هویت خود را با دستگاه تأیید کنید.">
      <form className="account-form" onSubmit={event => {event.preventDefault();register.mutate()}}>
        <Field label="نام دلخواه برای این دستگاه">{f => <TextInput id={f.id} value={name} maxLength={80}
          placeholder="مثلاً لپ‌تاپ شخصی" onChange={event => setName(event.target.value)}/>}</Field>
        <Field label="رمز عبور فعلی" required>{f => <TextInput id={f.id} dir="ltr" type="password"
          autoComplete="current-password" required value={password}
          onChange={event => setPassword(event.target.value)}/>}</Field>
        {register.isError && <p className="error" role="alert">{explanation(register.error)}</p>}
        <Button type="submit" disabled={!password || register.isPending}>{register.isPending ? 'در انتظار تأیید دستگاه...' : 'ثبت کلید عبور'}</Button>
      </form>
    </Dialog>

    <Dialog open={removing !== null} onOpenChange={open => {if (!open && !remove.isPending){setRemoving(null);setRemovePassword('');remove.reset()}}}
      title="حذف کلید عبور" description={'برای حذف ' + (removing?.name ?? 'Passkey') + '، رمز فعلی حساب را تأیید کنید.'}>
      <form className="account-form" onSubmit={event => {event.preventDefault();remove.mutate()}}>
        <Field label="رمز عبور فعلی" required>{f => <TextInput id={f.id} dir="ltr" type="password"
          autoComplete="current-password" value={removePassword} required
          onChange={event => setRemovePassword(event.target.value)}/>}</Field>
        {remove.isError && <p className="error" role="alert">{explanation(remove.error)}</p>}
        <Button variant="danger" type="submit" disabled={!removePassword || remove.isPending}>
          {remove.isPending ? 'در حال حذف...' : 'حذف این Passkey'}</Button>
      </form>
    </Dialog>
  </Card>
}
