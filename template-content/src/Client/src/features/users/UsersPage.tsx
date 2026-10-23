import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { BadgeCheck, Ban, ChevronLeft, ChevronRight, KeyRound, LockKeyhole, Mail, Pencil, RefreshCcw, Search, Shield, ShieldCheck, Trash2, UserPlus, Users, X } from 'lucide-react'
import { usersApi, policies, permissionLabels } from './users.api'
import type { Permission, User } from './users.api'
import { Card } from '../../shared/ui/Card'
import { Button } from '../../shared/ui/Button'
import { Dialog } from '../../shared/ui/Dialog'
import { ConfirmDialog } from '../../shared/ui/ConfirmDialog'
import { Field, Form, TextInput } from '../../shared/ui/Form'
import { CheckBox } from '../../shared/ui/Form'
import { useToast } from '../../shared/ui/useToast'
import { accountSchema, createUserSchema } from './users.schema'
import './users.css'

type Props = { canManage: boolean; canManageClaims: boolean; currentUserName?: string }
const allPermissions = Object.values(policies)
type Tab = 'account' | 'permissions' | 'role'

function PermissionEditor({value, title, disabled, busy, onSave}: {
  value: string[]; title: string; disabled: boolean; busy: boolean
  onSave: (value: string[]) => Promise<void>
}) {
  const [draft,setDraft] = useState<string[]>(value)
  const changed = allPermissions.some(item=>value.includes(item)!==draft.includes(item))
  const [error,setError] = useState('')
  return <section className="manage-permissions">
    <div className="manage-section-heading"><div><h3>{title}</h3><p>مجوزها در API اعتبارسنجی می‌شوند و فقط تغییرات مجاز ذخیره خواهند شد.</p></div></div>
    <div className="manage-permission-list">
      {allPermissions.map(permission=><CheckBox key={permission}
        label={permissionLabels[permission as Permission]} checked={draft.includes(permission)}
        disabled={disabled||busy} onChange={event=>{
          setError('')
          setDraft(old=>event.target.checked ? [...old,permission] : old.filter(item=>item!==permission))
        }}/>)}
    </div>
    {error && <p role="alert" className="ui-field-error">{error}</p>}
    {!disabled && <div className="manage-form-actions">
      <Button type="button" disabled={!changed||busy} onClick={()=>void onSave(draft).catch(()=>setError('ذخیره مجوزها ناموفق بود.'))}>
        {busy?'در حال ذخیره...':'ذخیره مجوزها'}
      </Button>
      <Button type="button" variant="ghost" disabled={!changed||busy} onClick={()=>{setDraft(value);setError('')}}>بازنشانی</Button>
    </div>}
  </section>
}

export function UsersPage({canManage,canManageClaims,currentUserName}:Props) {
  const toast=useToast()
  const queryClient=useQueryClient()
  const [search,setSearch]=useState('')
  const [term,setTerm]=useState('')
  const [page,setPage]=useState(0)
  const [selectedId,setSelectedId]=useState<string|null>(null)
  const [tab,setTab]=useState<Tab>('account')
  const [dialog,setDialog]=useState<'create'|'edit'|null>(null)
  const [pendingAction,setPendingAction]=useState<'delete'|'lock'|'unlock'|null>(null)
  const [userName,setUserName]=useState('')
  const [email,setEmail]=useState('')
  const [password,setPassword]=useState('')
  const [formError,setFormError]=useState('')
  const offset=page*20

  const users=useQuery({queryKey:['users',offset,term],queryFn:()=>usersApi.list(offset,term)})
  const roles=useQuery({queryKey:['roles'],queryFn:usersApi.roles})
  const selected=users.data?.items.find(user=>user.id===selectedId)??users.data?.items[0]
  const memberRole=roles.data?.find(role=>role.name==='Users')
  const protectedAccount=!selected || selected.roles.includes('Administrators') ||
    selected.userName.toLocaleLowerCase()===currentUserName?.toLocaleLowerCase()
  const canEdit=canManage&&!protectedAccount
  const canGrant=canManageClaims&&!protectedAccount
  const pages=Math.max(1,Math.ceil((users.data?.total??0)/20))

  async function refresh() {
    await Promise.all([
      queryClient.invalidateQueries({queryKey:['users']}),
      queryClient.invalidateQueries({queryKey:['roles']}),
      queryClient.invalidateQueries({queryKey:['session']})
    ])
  }
  function showFailure(error:unknown) {
    toast.show(error instanceof Error?error.message:'انجام عملیات ناموفق بود.','error')
  }
  const create=useMutation({
    mutationFn:({userName,email,password}:{userName:string;email:string;password:string})=>usersApi.create(userName,email,password),
    onSuccess:async(user)=>{await refresh();setDialog(null);setPassword('');setUserName('');setEmail('');setSelectedId(user.id);setPage(0);setTerm(user.userName);setSearch(user.userName);toast.show('کاربر جدید ایجاد شد.','success')}
  })
  const update=useMutation({
    mutationFn:({id,userName,email}:{id:string;userName:string;email:string})=>usersApi.updateAccount(id,userName,email),
    onSuccess:async(user)=>{await refresh();setDialog(null);setSelectedId(user.id);setPage(0);setTerm(user.userName);setSearch(user.userName);toast.show('ایمیل حساب به‌روزرسانی شد.','success')}
  })
  const changeLock=useMutation({
    mutationFn:({id,locked}:{id:string;locked:boolean})=>usersApi.setLocked(id,locked),
    onSuccess:async()=>{await refresh();toast.show('وضعیت حساب تغییر کرد.','success')}
  })
  const changeRoles=useMutation({
    mutationFn:({id,roles}:{id:string;roles:string[]})=>usersApi.setRoles(id,roles),
    onSuccess:async()=>{await refresh();toast.show('عضویت در نقش به‌روزرسانی شد.','success')},
    onError:showFailure
  })
  const remove=useMutation({
    mutationFn:(id:string)=>usersApi.remove(id),
    onSuccess:async()=>{setSelectedId(null);await refresh();toast.show('حساب کاربری حذف شد.','success')}
  })
  const updatePermission=useMutation({
    mutationFn:({id,permissions}:{id:string;permissions:string[]})=>usersApi.permissions(id,permissions),
    onSuccess:async()=>{await refresh();toast.show('مجوزهای مستقیم ذخیره شد.','success')},
    onError:showFailure
  })
  const updateRole=useMutation({
    mutationFn:({name,permissions}:{name:string;permissions:string[]})=>usersApi.rolePermissions(name,permissions),
    onSuccess:async()=>{await refresh();toast.show('مجوزهای نقش ذخیره شد.','success')},
    onError:showFailure
  })

  async function submitAccount(event:React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const parsed=dialog==='create'?createUserSchema.safeParse({userName,email,password}):accountSchema.safeParse({userName,email})
    if(!parsed.success){setFormError(parsed.error.issues[0]?.message??'اطلاعات نامعتبر است.');return}
    setFormError('')
    try {
      if(dialog==='create') await create.mutateAsync({userName:userName.trim(),email:email.trim(),password})
      else if(selected) await update.mutateAsync({id:selected.id,userName:userName.trim(),email:email.trim()})
    } catch(error) {setFormError(error instanceof Error?error.message:'ذخیره ناموفق بود.')}
  }
  function startCreate(){setUserName('');setEmail('');setPassword('');setFormError('');setDialog('create')}
  function startEdit(){if(!selected)return;setUserName(selected.userName);setEmail(selected.email);setFormError('');setDialog('edit')}
  async function confirmAction() {
    if(!selected || !pendingAction)return
    try {
      if(pendingAction==='delete')await remove.mutateAsync(selected.id)
      else await changeLock.mutateAsync({id:selected.id,locked:pendingAction==='lock'})
      setPendingAction(null)
    }catch(error){showFailure(error);throw error}
  }
  function openUser(user:User){setSelectedId(user.id);setTab('account')}
  function searchUsers(event:React.FormEvent) {event.preventDefault();setTerm(search.trim());setPage(0);setSelectedId(null)}

  return <div className="page motion-enter manage-users">
    <div className="manage-heading">
      <div><p className="eyebrow">Identity / Administration</p><h1>مدیریت کاربران</h1>
        <p className="muted">مدیریت حساب‌ها، نقش‌ها و مجوزها در یک فضای کاری امن و یکپارچه</p></div>
      {canManage && <Button type="button" onClick={startCreate}><UserPlus size={18}/>کاربر جدید</Button>}
    </div>
    <div className="manage-stats">
      <div className="manage-stat"><Users size={19}/><div><strong>{(users.data?.total??0).toLocaleString('fa-IR')}</strong><span>کاربر ثبت‌شده</span></div></div>
      <div className="manage-stat"><ShieldCheck size={19}/><div><strong>{(roles.data?.length??0).toLocaleString('fa-IR')}</strong><span>نقش سیستم</span></div></div>
      <div className="manage-stat"><KeyRound size={19}/><div><strong>{allPermissions.length.toLocaleString('fa-IR')}</strong><span>مجوز تعریف‌شده</span></div></div>
    </div>
    <div className="manage-layout">
      <Card className="manage-list-panel">
        <header className="manage-panel-heading"><div><h2>فهرست کاربران</h2><span>انتخاب کاربر برای مشاهده جزئیات</span></div>
          <button type="button" className="ui-icon-action" aria-label="بارگذاری مجدد" onClick={()=>void refresh()}><RefreshCcw size={18}/></button></header>
        <Form className="manage-search" onSubmit={searchUsers}>
          <label className="sr-only" htmlFor="manage-search-input">جستجوی کاربران</label>
          <Search size={18} aria-hidden="true"/>
          <input id="manage-search-input" value={search} placeholder="نام کاربری یا ایمیل..."
            onChange={event=>setSearch(event.target.value)}/>
          {search && <button type="button" className="ui-icon-action" aria-label="پاک کردن جستجو"
            onClick={()=>{setSearch('');setTerm('');setPage(0)}}><X size={16}/></button>}
          <button type="submit" className="manage-search-submit">جستجو</button>
        </Form>
        {users.isPending?<div role="status" className="manage-empty">در حال دریافت کاربران...</div>:
          users.isError?<div className="manage-empty" role="alert">دریافت کاربران ناموفق بود.
            <Button variant="secondary" onClick={()=>void users.refetch()}>تلاش مجدد</Button></div>:
          users.data?.items.length?<div className="manage-user-list">
            {users.data.items.map(user=><button type="button" key={user.id}
              className={'manage-user '+(selected?.id===user.id?'manage-user--selected':'')} onClick={()=>openUser(user)}
              aria-pressed={selected?.id===user.id}>
              <span className="manage-avatar"><Users size={19}/></span>
              <span className="manage-user-name"><strong dir="ltr">{user.userName}</strong>
                <small dir="ltr">{user.email}</small>
                <span>{user.roles.join('، ')||'بدون نقش'} <span aria-hidden="true">·</span>
                  {user.isLocked?' مسدود':' فعال'}</span></span>
              <ChevronLeft size={17} aria-hidden="true"/>
            </button>)}
          </div>:<div className="manage-empty">کاربری با این مشخصات پیدا نشد.</div>}
        <div className="manage-pager">
          <span>صفحه {(page+1).toLocaleString('fa-IR')} از {pages.toLocaleString('fa-IR')}</span>
          <div><Button variant="ghost" type="button" disabled={page<=0} onClick={()=>{setPage(page-1);setSelectedId(null)}}><ChevronRight size={16}/>قبلی</Button>
            <Button variant="ghost" type="button" disabled={page>=pages-1} onClick={()=>{setPage(page+1);setSelectedId(null)}}>بعدی<ChevronLeft size={16}/></Button></div>
        </div>
      </Card>
      <div className="manage-detail-column">
        {selected ? <Card className="manage-detail-panel">
          <div className="manage-person"><div className="manage-avatar manage-avatar--large"><Users size={27}/></div>
            <div><h2 dir="ltr">{selected.userName}</h2><div className="manage-tags">
              <span className={'manage-pill '+(selected.isLocked?'manage-pill--bad':'manage-pill--good')}>
                {selected.isLocked?<LockKeyhole size={13}/>:<BadgeCheck size={13}/>}
                {selected.isLocked?'مسدود':'فعال'}
              </span>
              {selected.roles.map(role=><span className="manage-pill" key={role}>{role}</span>)}
            </div></div></div>
          <nav className="manage-tabs" aria-label="بخش‌های مدیریت کاربر">
            <button type="button" className={tab==='account'?'active':''} aria-current={tab==='account'?'page':undefined}
              onClick={()=>setTab('account')}><Mail size={16}/>حساب</button>
            <button type="button" className={tab==='permissions'?'active':''} aria-current={tab==='permissions'?'page':undefined}
              onClick={()=>setTab('permissions')}><KeyRound size={16}/>مجوزها</button>
            <button type="button" className={tab==='role'?'active':''} aria-current={tab==='role'?'page':undefined}
              onClick={()=>setTab('role')}><Shield size={16}/>نقش‌ها</button>
          </nav>
          {tab==='account'&&<div className="manage-detail-body">
            <div className="manage-info-line"><span>نام کاربری</span><strong dir="ltr">{selected.userName}</strong></div>
            <div className="manage-info-line"><span>آدرس ایمیل</span><strong dir="ltr">{selected.email}</strong></div>
            <div className="manage-info-line"><span>تأیید ایمیل</span><strong>{selected.emailConfirmed?'تأیید شده':'تأیید نشده'}</strong></div>
            <div className="manage-info-line"><span>مجوز مستقیم</span><strong>{selected.directPermissions.length.toLocaleString('fa-IR')} مورد</strong></div>
            {protectedAccount&&<p className="manage-protected"><ShieldCheck size={18}/>این حساب محافظت‌شده است. تغییرات مدیریتی آن در این قسمت مجاز نیست.</p>}
            {canEdit&&<div className="manage-actions">
              <Button variant="secondary" onClick={startEdit}><Pencil size={16}/>ویرایش حساب</Button>
              <Button variant="secondary" onClick={()=>setPendingAction(selected.isLocked?'unlock':'lock')}>
                {selected.isLocked?<BadgeCheck size={16}/>:<Ban size={16}/>}
                {selected.isLocked?'رفع مسدودی':'مسدودکردن'}
              </Button>
              <Button variant="danger" onClick={()=>setPendingAction('delete')}><Trash2 size={16}/>حذف حساب</Button>
            </div>}
          </div>}
          {tab==='permissions'&&<div className="manage-detail-body">
            <PermissionEditor key={selected.id+':'+selected.directPermissions.join(',')}
              title="مجوزهای مستقیم" value={selected.directPermissions}
              disabled={!canGrant} busy={updatePermission.isPending}
              onSave={permissions=>updatePermission.mutateAsync({id:selected.id,permissions})}/>
            {selected.roles.includes('Administrators')&&<p className="manage-protected">مجوزهای نقش Administrators در این صفحه قابل تغییر نیست.</p>}
          </div>}
          {tab==='role'&&<div className="manage-detail-body">
            <h3>عضویت در نقش‌ها</h3><p className="muted">برای جلوگیری از ارتقای ناخواسته سطح دسترسی، فقط عضویت در Users قابل تغییر است.</p>
            <div className="manage-role-option"><div><strong>Users</strong><p>اعمال مجوزهای نقش Users بر حساب انتخاب‌شده</p></div>
              <CheckBox label="عضو نقش Users" checked={selected.roles.includes('Users')} disabled={!canGrant||changeRoles.isPending}
                onChange={event=>changeRoles.mutate({id:selected.id,roles:event.target.checked?['Users']:[]})}/></div>
            {protectedAccount&&<p className="manage-protected">تغییر عضویت حساب محافظت‌شده مجاز نیست.</p>}
          </div>}
        </Card> : <Card className="manage-detail-panel manage-empty-detail">
          <Users size={35}/><h2>کاربری انتخاب نشده</h2><p className="muted">از فهرست، یک حساب را برای بررسی انتخاب کنید.</p>
        </Card>}
        {canManageClaims && <Card className="manage-role-panel">
          <div className="manage-section-heading"><div><h2>مجوزهای نقش Users</h2><p>تغییرات این بخش بر اعضای نقش اثر می‌گذارد.</p></div><Shield size={22}/></div>
          {roles.isPending?<p role="status">در حال دریافت نقش‌ها...</p>:roles.isError?<p role="alert">دریافت نقش‌ها ناموفق بود.</p>:
            memberRole?<PermissionEditor key={memberRole.permissions.join(',')} title="مجوزهای ارث‌بری"
              value={memberRole.permissions} disabled={!canManageClaims} busy={updateRole.isPending}
              onSave={permissions=>updateRole.mutateAsync({name:memberRole.name,permissions})}/>:
              <p className="muted">نقش Users هنوز ایجاد نشده است.</p>}
        </Card>}
      </div>
    </div>
    <Dialog open={dialog!==null} onOpenChange={value=>{if(!value&&!create.isPending&&!update.isPending)setDialog(null)}}
      title={dialog==='create'?'ایجاد کاربر جدید':'ویرایش حساب'}
      description={dialog==='create'?'کاربر جدید با نقش Users ایجاد می‌شود.':'با تغییر ایمیل، وضعیت تأیید آن بازنشانی می‌شود.'}
      footer={<><Button variant="secondary" disabled={create.isPending||update.isPending} onClick={()=>setDialog(null)}>انصراف</Button>
        <Button form="manage-account-form" type="submit" disabled={create.isPending||update.isPending}>
          {create.isPending||update.isPending?'در حال ذخیره...':dialog==='create'?'ایجاد کاربر':'ذخیره تغییرات'}</Button></>}>
      <Form id="manage-account-form" onSubmit={event=>void submitAccount(event)} className="manage-account-form">
        <Field label="نام کاربری" required>{field=><TextInput id={field.id} type="text" dir="ltr" autoComplete="off" required
          maxLength={128} value={userName} onChange={event=>{setUserName(event.target.value);setFormError('')}}/>}</Field>
        <Field label="ایمیل" required>{field=><TextInput id={field.id} type="email" dir="ltr" autoComplete="off" required
          maxLength={256} value={email} onChange={event=>{setEmail(event.target.value);setFormError('')}}/>}</Field>
        {dialog==='create'&&<Field label="رمز اولیه" required hint="حداقل ۱۲ کاراکتر">{field=><TextInput id={field.id}
          type="password" dir="ltr" minLength={12} required autoComplete="new-password"
          value={password} onChange={event=>{setPassword(event.target.value);setFormError('')}}/>}</Field>}
        {formError&&<p className="ui-field-error" role="alert">{formError}</p>}
      </Form>
    </Dialog>
    <ConfirmDialog open={pendingAction!==null} onOpenChange={value=>{if(!value)setPendingAction(null)}}
      title={pendingAction==='delete'?'حذف دائمی حساب؟':pendingAction==='lock'?'مسدود کردن کاربر؟':'رفع مسدودی حساب؟'}
      description={pendingAction==='delete'? 'کاربر «'+(selected?.email??'')+'» حذف می‌شود. این عملیات قابل بازگشت نیست.'
        :pendingAction==='lock'?'امکان ورود مجدد این حساب مسدود می‌شود.':'کاربر دوباره اجازه ورود خواهد داشت.'}
      destructive={pendingAction!=='unlock'} confirmLabel={pendingAction==='delete'?'حذف حساب':'تأیید تغییر وضعیت'}
      onConfirm={confirmAction}/>
  </div>
}
