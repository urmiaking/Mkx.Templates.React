import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Shield, Plus, Users, Search, KeyRound, UserPlus, RefreshCcw } from 'lucide-react'
import { usersApi, policies, permissionLabels } from './users.api'
import type { User, Permission } from './users.api'
import { Card } from '../../shared/ui/Card'
import { Button } from '../../shared/ui/Button'

type Props = { canManage: boolean; canManageClaims: boolean }
const allPermissions = Object.values(policies)

function Permissions({ title, values, onSave, busy, disabled }: {
  title: string; values: string[]; onSave: (values: string[]) => void; busy: boolean; disabled: boolean
}) {
  const [draft, setDraft] = useState<string[] | null>(null)
  const selected = draft ?? values
  const changed = allPermissions.some(key => selected.includes(key) !== values.includes(key))

  return <section className="permission-section">
    <h3>{title}</h3>
    <div className="permission-grid">
      {allPermissions.map(permission => <label className="permission-option" key={permission}>
        <input type="checkbox" checked={selected.includes(permission)} disabled={disabled || busy}
          onChange={event => setDraft(prev => {
            const current = prev ?? values
            return event.target.checked ? [...current, permission] : current.filter(x => x !== permission)
          })} />
        <span>{permissionLabels[permission as Permission]}</span>
      </label>)}
    </div>
    {!disabled && <div className="permission-actions">
      <Button type="button" disabled={!changed || busy} onClick={() => {
        onSave(selected)
      }}>{busy ? 'در حال ذخیره...' : 'ذخیره مجوزها'}</Button>
      <Button type="button" variant="secondary" disabled={!changed || busy} onClick={() => setDraft(null)}>بازنشانی</Button>
    </div>}
  </section>
}

export function UsersPage({ canManage, canManageClaims }: Props) {
  const [search, setSearch] = useState('')
  const [searchTerm, setSearchTerm] = useState('')
  const [skip, setSkip] = useState(0)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const queryClient = useQueryClient()
  const users = useQuery({ queryKey: ['users', skip, searchTerm], queryFn: () => usersApi.list(skip, searchTerm) })
  const roles = useQuery({ queryKey: ['roles'], queryFn: usersApi.roles })
  const selected = users.data?.items.find(x => x.id === selectedId)
  const member = roles.data?.find(x => x.name === 'Users')

  const create = useMutation({
    mutationFn: () => usersApi.create(email.trim(), password),
    onSuccess: async () => { setEmail(''); setPassword(''); await queryClient.invalidateQueries({ queryKey: ['users'] }) }
  })
  const updateUser = useMutation({
    mutationFn: (input: { id: string; values: string[] }) => usersApi.permissions(input.id, input.values),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['users'] })
  })
  const updateRole = useMutation({
    mutationFn: (input: { name: string; values: string[] }) => usersApi.rolePermissions(input.name, input.values),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['roles'] })
      await queryClient.invalidateQueries({ queryKey: ['session'] })
    }
  })

  const problem = create.error || updateUser.error || updateRole.error

  return <div className="page motion-enter">
    <div className="page-head">
      <div><p className="eyebrow">هویت و مجوزهای دسترسی</p><h1>مدیریت کاربران</h1>
        <p className="muted">دسترسی‌های قابلیت‌محور، جدا از نمایش منو و با اعتبارسنجی سمت سرور</p></div>
      <span className="count-pill">{users.data?.total ?? 0} کاربر</span>
    </div>
    {problem && <p className="error" role="alert">{problem.message}</p>}
    {canManage && <Card className="content-card user-create">
      <div className="section-headline"><UserPlus size={20}/><h2>کاربر جدید</h2></div>
      <form className="create-user-form" onSubmit={event => { event.preventDefault(); create.mutate() }}>
        <label><span>ایمیل</span><input type="email" dir="ltr" required maxLength={256} autoComplete="off"
          value={email} onChange={e => setEmail(e.target.value)} placeholder="user@example.com" /></label>
        <label><span>رمز عبور اولیه</span><input type="password" dir="ltr" required minLength={12} autoComplete="new-password"
          value={password} onChange={e => setPassword(e.target.value)} placeholder="حداقل ۱۲ کاراکتر" /></label>
        <Button type="submit" disabled={create.isPending}><Plus size={17}/>{create.isPending ? 'در حال ایجاد...' : 'ایجاد کاربر'}</Button>
      </form>
      <p className="muted small-note">کاربر تازه با نقش Users ساخته می‌شود. برای حفاظت از حساب‌ها، ارتقا به Administrators در این فرم ممکن نیست.</p>
    </Card>}
    <div className="admin-layout">
      <Card className="content-card">
        <div className="section-headline"><Users size={20}/><h2>فهرست کاربران</h2></div>
        <form className="user-search" onSubmit={event => { event.preventDefault(); setSkip(0); setSearchTerm(search.trim()) }}>
          <input aria-label="جستجو کاربران" placeholder="جستجو بر اساس ایمیل..." value={search} onChange={event => setSearch(event.target.value)}/>
          <Button type="submit" variant="secondary"><Search size={17}/>جستجو</Button>
          <button className="icon-button" type="button" aria-label="بازخوانی" onClick={() => queryClient.invalidateQueries({ queryKey: ['users'] })}><RefreshCcw size={18}/></button>
        </form>
        {users.isPending ? <p role="status" className="muted">در حال دریافت کاربران...</p> :
          users.isError ? <p role="alert" className="error">فهرست قابل دریافت نیست. <button onClick={() => users.refetch()}>تلاش مجدد</button></p> :
          users.data?.items.length ?
            <div className="user-list">{users.data.items.map((user: User) =>
              <button type="button" className={'user-row ' + (selectedId === user.id ? 'selected' : '')}
                key={user.id} onClick={() => setSelectedId(user.id)}>
                <span className="avatar-placeholder"><Users size={18}/></span>
                <span className="user-ident"><strong dir="ltr">{user.email}</strong><small>{user.roles.join('، ') || 'بدون نقش'} · {user.directPermissions.length} مجوز مستقیم</small></span>
                <KeyRound size={17}/>
              </button>)}</div> :
            <p className="muted">کاربری با این مشخصات یافت نشد.</p>}
        <div className="pagination">
          <Button variant="secondary" disabled={!skip} onClick={() => { setSkip(Math.max(0, skip - 20)); setSelectedId(null) }}>قبلی</Button>
          <span>{Math.floor(skip / 20) + 1}</span>
          <Button variant="secondary" disabled={skip + 20 >= (users.data?.total ?? 0)} onClick={() => { setSkip(skip + 20); setSelectedId(null) }}>بعدی</Button>
        </div>
      </Card>
      <div className="permission-panels">
        <Card className="content-card">
          <div className="section-headline"><Shield size={20}/><h2>مجوزهای مستقیم کاربر</h2></div>
          {selected ? <Permissions key={selected.id + ':' + selected.directPermissions.join(',')}
            title={selected.email} values={selected.directPermissions}
            disabled={!canManageClaims || selected.roles.includes('Administrators')} busy={updateUser.isPending}
            onSave={values => updateUser.mutate({ id: selected.id, values })} /> :
            <p className="muted">برای بررسی یا ویرایش مجوزهای مستقیم، یک کاربر را انتخاب کنید.</p>}
          {selected?.roles.includes('Administrators') && <p className="notice">حساب Administrators از ویرایش مجوزهای عمومی محافظت می‌شود.</p>}
        </Card>
        <Card className="content-card">
          <div className="section-headline"><KeyRound size={20}/><h2>مجوزهای نقش Users</h2></div>
          {roles.isPending ? <p className="muted">در حال بارگذاری نقش‌ها...</p> :
            roles.isError ? <p role="alert" className="error">دریافت نقش‌ها ناموفق بود.</p> :
            member ? <Permissions key={member.permissions.join(',')}
              title="مجوزهای موروثی تمام اعضای Users" values={member.permissions}
              disabled={!canManageClaims} busy={updateRole.isPending}
              onSave={values => updateRole.mutate({ name: member.name, values })} /> :
              <p className="muted">نقش Users با ایجاد اولین کاربر جدید ساخته می‌شود.</p>}
        </Card>
      </div>
    </div>
  </div>
}
