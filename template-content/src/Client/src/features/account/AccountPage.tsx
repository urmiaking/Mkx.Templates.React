import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { AtSign, CheckCircle2, KeyRound, ShieldAlert, UserRound } from 'lucide-react'
import { accountApi } from './account.api'
import type { AccountProfile } from './account.api'
import { changePasswordSchema, profileSchema } from './account.schema'
import { ApiError } from '../../shared/api/http'
import { Button } from '../../shared/ui/Button'
import { Card } from '../../shared/ui/Card'
import { Field, Form, TextInput } from '../../shared/ui/Form'
import { useToast } from '../../shared/ui/useToast'
import { MfaSettings } from './MfaSettings'
import { PasskeySettings } from './PasskeySettings'

function ErrorMessage({ error }: { error: unknown }) {
  return error ? <p role="alert" className="error">{error instanceof ApiError && error.status === 503
    ? 'ارسال ایمیل هنوز روی سرور پیکربندی نشده است.'
    : error instanceof Error ? error.message : 'درخواست انجام نشد.'}</p> : null
}

function ProfileEditor({ initial }: { initial: AccountProfile }) {
  const [userName, setUserName] = useState(initial.userName)
  const [email, setEmail] = useState(initial.email ?? '')
  const [errors, setErrors] = useState<Record<string, string>>({})
  const queryClient = useQueryClient()
  const toast = useToast()
  const save = useMutation({
    mutationFn: () => accountApi.updateProfile(userName, email),
    onSuccess: async result => {
      queryClient.setQueryData(['account', 'profile'], result)
      await queryClient.invalidateQueries({ queryKey: ['session'] })
      toast.show('تغییرات حساب ذخیره شد.', 'success')
    }
  })
  const verify = useMutation({
    mutationFn: accountApi.sendVerification,
    onSuccess: () => toast.show('پیوند تأیید ایمیل ارسال شد.', 'success')
  })
  return <Card className="account-card">
    <div className="account-card-heading"><span className="account-icon"><UserRound size={22}/></span><div><h2>اطلاعات حساب</h2><p className="muted">نام کاربری و ایمیل خود را مدیریت کنید.</p></div></div>
    <Form busy={save.isPending} className="account-form" onSubmit={event => {
      event.preventDefault()
      const result = profileSchema.safeParse({ userName, email })
      if (!result.success) { setErrors(Object.fromEntries(result.error.issues.map(issue => [String(issue.path[0]), issue.message]))); return }
      setErrors({})
      save.mutate()
    }}>
      <Field label="نام کاربری" required error={errors.userName}>
        {field => <TextInput id={field.id} aria-describedby={field.describedBy} aria-invalid={field.invalid} dir="ltr" autoComplete="username"
          value={userName} onChange={event => setUserName(event.target.value)} maxLength={128}/>}
      </Field>
      <Field label="ایمیل" required error={errors.email} hint="با تغییر ایمیل، تأیید دوباره آن لازم است.">
        {field => <TextInput id={field.id} aria-describedby={field.describedBy} aria-invalid={field.invalid} type="email" dir="ltr" autoComplete="email"
          value={email} onChange={event => setEmail(event.target.value)} maxLength={256}/>}
      </Field>
      <div className="account-actions"><Button type="submit" disabled={save.isPending || verify.isPending}>ذخیره تغییرات</Button></div>
      <ErrorMessage error={save.error}/>
    </Form>
    <div className={'email-status ' + (initial.emailConfirmed ? 'email-status--ok' : '')}>
      {initial.emailConfirmed ? <CheckCircle2 size={18}/> : <ShieldAlert size={18}/>}
      <span>{initial.emailConfirmed ? 'ایمیل تأیید شده است.' : 'ایمیل هنوز تأیید نشده است.'}</span>
      {!initial.emailConfirmed && <Button type="button" variant="secondary" disabled={verify.isPending || save.isPending}
        onClick={() => verify.mutate()}>{verify.isPending ? 'در حال ارسال...' : 'ارسال پیوند تأیید'}</Button>}
    </div>
    <ErrorMessage error={verify.error}/>
  </Card>
}

function PasswordEditor() {
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [errors, setErrors] = useState<Record<string,string>>({})
  const toast = useToast()
  const update = useMutation({
    mutationFn: () => accountApi.changePassword(currentPassword, newPassword),
    onSuccess: () => {
      setCurrentPassword(''); setNewPassword(''); setConfirmPassword('')
      toast.show('رمز عبور با موفقیت تغییر کرد.', 'success')
    }
  })
  return <Card className="account-card">
    <div className="account-card-heading"><span className="account-icon"><KeyRound size={22}/></span><div><h2>تغییر رمز عبور</h2><p className="muted">برای امنیت حساب، رمز فعلی را وارد کنید.</p></div></div>
    <Form busy={update.isPending} className="account-form" onSubmit={event => {
      event.preventDefault()
      const result = changePasswordSchema.safeParse({ currentPassword, newPassword, confirmPassword })
      if (!result.success) { setErrors(Object.fromEntries(result.error.issues.map(issue => [String(issue.path[0]), issue.message]))); return }
      setErrors({})
      update.mutate()
    }}>
      <Field label="رمز عبور فعلی" required error={errors.currentPassword}>
        {field => <TextInput id={field.id} aria-describedby={field.describedBy} aria-invalid={field.invalid} dir="ltr" type="password" autoComplete="current-password"
          value={currentPassword} onChange={event => setCurrentPassword(event.target.value)}/>}
      </Field>
      <Field label="رمز عبور جدید" required error={errors.newPassword} hint="حداقل ۱۲ نویسه، شامل حرف بزرگ و کوچک، عدد و نویسه ویژه">
        {field => <TextInput id={field.id} aria-describedby={field.describedBy} aria-invalid={field.invalid} dir="ltr" type="password" autoComplete="new-password"
          value={newPassword} onChange={event => setNewPassword(event.target.value)}/>}
      </Field>
      <Field label="تکرار رمز عبور جدید" required error={errors.confirmPassword}>
        {field => <TextInput id={field.id} aria-describedby={field.describedBy} aria-invalid={field.invalid} dir="ltr" type="password" autoComplete="new-password"
          value={confirmPassword} onChange={event => setConfirmPassword(event.target.value)}/>}
      </Field>
      <div className="account-actions"><Button type="submit" disabled={update.isPending}>تغییر رمز عبور</Button></div>
      <ErrorMessage error={update.error}/>
    </Form>
  </Card>
}

export function AccountPage() {
  const profile = useQuery({ queryKey: ['account','profile'], queryFn: accountApi.profile })
  if (profile.isPending) return <div className="page" role="status">در حال دریافت اطلاعات حساب...</div>
  if (profile.isError) return <div className="page"><ErrorMessage error={profile.error}/></div>
  return <div className="page motion-enter">
    <div className="page-head"><div><p className="eyebrow">حساب شخصی</p><h1>پروفایل و امنیت</h1><p className="muted">اطلاعات ورود و روش بازیابی حساب خود را مدیریت کنید.</p></div><AtSign className="account-title-icon" size={30}/></div>
    <div className="account-grid">
      <ProfileEditor key={profile.data.userName + profile.data.email} initial={profile.data}/>
      <PasswordEditor/>
      <MfaSettings/>
      <PasskeySettings/>
    </div>
  </div>
}
