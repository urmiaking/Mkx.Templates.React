import { useState } from 'react'
import { useMutation } from '@tanstack/react-query'
import { Link, useSearchParams } from 'react-router-dom'
import { CheckCircle2, KeyRound, MailCheck } from 'lucide-react'
import { accountApi } from './account.api'
import { resetPasswordSchema } from './account.schema'
import { Button } from '../../shared/ui/Button'
import { Card } from '../../shared/ui/Card'
import { Field, Form, TextInput } from '../../shared/ui/Form'

function RecoveryShell({ title, description, children }: { title: string; description: string; children: React.ReactNode }) {
  return <div className="login-wrap motion-enter"><Card className="login-card account-recovery">
    <div className="feature-icon"><KeyRound size={23}/></div>
    <h1>{title}</h1><p className="muted">{description}</p>{children}
    <Link className="account-back-link" to="/login">بازگشت به ورود</Link>
  </Card></div>
}

export function ForgotPasswordPage() {
  const [email, setEmail] = useState('')
  const send = useMutation({ mutationFn: () => accountApi.forgotPassword(email.trim()) })
  return <RecoveryShell title="بازیابی رمز عبور" description="ایمیل تأییدشده حساب را وارد کنید. اگر حسابی با آن وجود داشته باشد و ارسال ایمیل فعال باشد، پیوند بازیابی ارسال می‌شود.">
    {send.isSuccess ? <p className="notice" role="status"><MailCheck size={18}/> اگر حساب واجد شرایط باشد، پیوند بازیابی به ایمیل ارسال می‌شود.</p> :
      <Form busy={send.isPending} onSubmit={event => { event.preventDefault(); send.mutate() }}>
        <Field label="آدرس ایمیل" required>{field => <TextInput id={field.id} aria-describedby={field.describedBy} aria-invalid={field.invalid} dir="ltr" type="email" autoComplete="email"
          value={email} onChange={event => setEmail(event.target.value)} required/>}</Field>
        {send.isError && <p role="alert" className="error">امکان ثبت درخواست وجود ندارد. دوباره تلاش کنید.</p>}
        <Button type="submit" className="full-width" disabled={send.isPending}>{send.isPending ? 'در حال بررسی...' : 'دریافت پیوند بازیابی'}</Button>
      </Form>}
  </RecoveryShell>
}

export function ResetPasswordPage() {
  const [params] = useSearchParams()
  const email = params.get('email') ?? ''
  const token = params.get('token') ?? ''
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [errors, setErrors] = useState<Record<string,string>>({})
  const reset = useMutation({ mutationFn: () => accountApi.resetPassword(email, token, newPassword) })
  return <RecoveryShell title="تعیین رمز جدید" description="یک رمز عبور قوی و متفاوت انتخاب کنید.">
    {!email || !token ? <p role="alert" className="error">پیوند بازیابی ناقص است. درخواست جدیدی ثبت کنید.</p> :
    reset.isSuccess ? <p role="status" className="notice"><CheckCircle2 size={18}/> رمز جدید ثبت شد. حالا با نام کاربری و رمز جدید وارد شوید.</p> :
    <Form busy={reset.isPending} onSubmit={event => {
      event.preventDefault()
      const result = resetPasswordSchema.safeParse({newPassword,confirmPassword})
      if (!result.success) {setErrors(Object.fromEntries(result.error.issues.map(issue => [String(issue.path[0]),issue.message])));return}
      setErrors({})
      reset.mutate()
    }}>
      <Field label="رمز عبور جدید" required error={errors.newPassword} hint="حداقل ۱۲ نویسه، حروف بزرگ و کوچک، عدد و نویسه ویژه">
        {field => <TextInput id={field.id} aria-describedby={field.describedBy} aria-invalid={field.invalid} type="password" dir="ltr"
          autoComplete="new-password" value={newPassword} onChange={event => setNewPassword(event.target.value)}/>}
      </Field>
      <Field label="تکرار رمز عبور" required error={errors.confirmPassword}>
        {field => <TextInput id={field.id} aria-describedby={field.describedBy} aria-invalid={field.invalid} type="password" dir="ltr"
          autoComplete="new-password" value={confirmPassword} onChange={event => setConfirmPassword(event.target.value)}/>}
      </Field>
      {reset.isError && <p role="alert" className="error">پیوند منقضی یا نامعتبر است، یا رمز عبور شرایط امنیتی را ندارد.</p>}
      <Button className="full-width" type="submit" disabled={reset.isPending}>ثبت رمز عبور جدید</Button>
    </Form>}
    <Link className="account-back-link" to="/forgot-password">درخواست پیوند جدید</Link>
  </RecoveryShell>
}

export function VerifyEmailPage() {
  const [params] = useSearchParams()
  const userId = params.get('userId') ?? ''
  const token = params.get('token') ?? ''
  const verify = useMutation({ mutationFn: () => accountApi.verifyEmail(userId, token) })
  return <RecoveryShell title="تأیید آدرس ایمیل" description="برای تأیید ایمیل و فعال‌سازی بازیابی حساب، روی دکمه زیر بزنید.">
    {!userId || !token ? <p role="alert" className="error">پیوند تأیید نامعتبر است.</p> :
      verify.isSuccess ? <p role="status" className="notice"><CheckCircle2 size={18}/> ایمیل با موفقیت تأیید شد.</p> :
      <><Button className="full-width" disabled={verify.isPending} onClick={() => verify.mutate()}>تأیید ایمیل</Button>
      {verify.isError && <p role="alert" className="error">پیوند نامعتبر یا منقضی شده است.</p>}</>}
  </RecoveryShell>
}
