import { useEffect, useRef, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Check, Circle, Plus, Trash2, RefreshCcw } from 'lucide-react'
import { workItemApi } from './work-item.api'
import { workItemSchema } from './work-item.schema'
import type { WorkItem } from './work-item.schema'
import { Button } from '../../shared/ui/Button'
import { Card } from '../../shared/ui/Card'
import { ConfirmDialog } from '../../shared/ui/ConfirmDialog'
import { useToast } from '../../shared/ui/useToast'
import { ApiError } from '../../shared/api/http'

export function WorkItemsPage({ canManage }: { canManage: boolean }) {
  const [title, setTitle] = useState('')
  const titleInputRef = useRef<HTMLInputElement>(null)
  const [searchParams, setSearchParams] = useSearchParams()
  const createRequested = searchParams.get('create') === '1'
  const [pendingDeletion, setPendingDeletion] = useState<WorkItem | null>(null)
  const toast = useToast()

  useEffect(() => {
    if (!canManage || !createRequested) return
    titleInputRef.current?.scrollIntoView?.({ block: 'center', behavior: 'smooth' })
    titleInputRef.current?.focus()
    setSearchParams(previous => {
      const next = new URLSearchParams(previous)
      next.delete('create')
      return next
    }, { replace: true })
  }, [canManage, createRequested, setSearchParams])
  const [skip, setSkip] = useState(0)
  const [validationError, setValidationError] = useState('')
  const queryClient = useQueryClient()
  const items = useQuery({ queryKey: ['work-items', skip], queryFn: () => workItemApi.list(skip) })
  const total = Number(items.data?.total ?? 0)
  const refresh = () => queryClient.invalidateQueries({ queryKey: ['work-items'] })
  const add = useMutation({ mutationFn: workItemApi.create, onSuccess: () => { setTitle(''); setSkip(0); refresh(); toast.show('کار جدید ثبت شد.','success') } })
  const toggle = useMutation({ mutationFn: workItemApi.update, onSuccess: () => { refresh(); toast.show('تغییرات ذخیره شد.','success') } })
  const remove = useMutation({ mutationFn: workItemApi.delete, onSuccess: () => { refresh(); toast.show('کار حذف شد.','success') } })
  const failure = add.error || toggle.error || remove.error

  function submit(event: React.FormEvent) {
    event.preventDefault()
    const parsed = workItemSchema.safeParse({ title })
    if (!parsed.success) { setValidationError(parsed.error.issues[0]?.message || 'عنوان نامعتبر است.'); return }
    setValidationError('')
    add.mutate(parsed.data.title)
  }

  function WorkItemRow({ item }: { item: WorkItem }) {
    return <li className="work-item motion-enter">
      <button aria-label={item.isComplete ? 'علامت‌گذاری به‌عنوان انجام‌نشده' : 'علامت‌گذاری به‌عنوان انجام‌شده'} disabled={!canManage || toggle.isPending || remove.isPending} className={'check-action ' + (item.isComplete ? 'checked' : '')} onClick={() => toggle.mutate(item)}>
        {item.isComplete ? <Check size={17}/> : <Circle size={18}/>}
      </button>
      <span className={item.isComplete ? 'task-finished' : ''}>{item.title}</span>
      <span className="task-date" title={new Date(item.createdAt).toLocaleString('fa-IR')}>{new Date(item.createdAt).toLocaleDateString('fa-IR')}</span>
      <button className="icon-button danger" aria-label={'حذف ' + item.title} disabled={!canManage || remove.isPending} onClick={() => setPendingDeletion(item)}><Trash2 size={17}/></button>
    </li>
  }

  return <div className="page motion-enter">
    <div className="page-head">
      <div><p className="eyebrow">نمونه Feature · End-to-End</p><h1>مدیریت کارها</h1><p className="muted">نمونه‌ای از ارتباط React، API، Application و EF Core با کنترل نسخه و خطای استاندارد</p></div>
      <span className="count-pill">{total} مورد</span>
    </div>
    <Card className="content-card">
      <form className="create-row" onSubmit={submit}>
        <div className="input-holder"><label className="sr-only" htmlFor="new-title">عنوان کار</label><input ref={titleInputRef} id="new-title" placeholder="مثلاً طراحی صفحه گزارش‌ها..." value={title} onChange={event => { setTitle(event.target.value); setValidationError('') }} disabled={!canManage || add.isPending} /></div>
        <Button type="submit" disabled={!canManage || add.isPending}><Plus size={17}/>{add.isPending ? 'در حال ثبت...' : 'افزودن کار'}</Button>
      </form>
      {validationError && <p className="error" role="alert">{validationError}</p>}
      {!canManage && <p className="notice">برای ایجاد، ویرایش یا حذف وارد حساب کاربری شوید. فهرست قابل مشاهده است.</p>}
      {failure && <p className="error" role="alert">{failure instanceof ApiError && failure.status === 409 ? 'اطلاعات توسط کاربر دیگری تغییر کرده؛ فهرست را تازه‌سازی کنید.' : failure.message}</p>}
      <div className="list-heading"><h2>فهرست کارها</h2><button className="icon-button" aria-label="تازه‌سازی" onClick={() => refresh()}><RefreshCcw size={17}/></button></div>
      {items.isPending ? <p className="muted" role="status">در حال بارگذاری...</p> : items.isError ?
        <div role="alert" className="error">دریافت اطلاعات ناموفق بود. <button onClick={() => items.refetch()}>تلاش مجدد</button></div> :
        items.data?.items.length ? <ul className="work-list">{items.data.items.map(item => <WorkItemRow key={item.id} item={item}/>)}</ul> :
        <div className="empty-state"><Check size={27}/><h3>هنوز کاری ثبت نشده</h3><p className="muted">اولین مورد را از کادر بالا ثبت کنید.</p></div>}
      {total > 20 &&
        <div className="pagination">
          <Button variant="secondary" disabled={skip === 0} onClick={() => setSkip(Math.max(0, skip - 20))}>قبلی</Button>
          <span>{Math.floor(skip / 20) + 1} / {Math.ceil(total / 20)}</span>
          <Button variant="secondary" disabled={skip + 20 >= total} onClick={() => setSkip(skip + 20)}>بعدی</Button>
        </div>}
    </Card>
    <ConfirmDialog open={pendingDeletion !== null} onOpenChange={value => { if (!value) setPendingDeletion(null) }}
      title="حذف کار؟" description={pendingDeletion ? '«' + pendingDeletion.title + '» حذف خواهد شد.' : ''}
      destructive confirmLabel="حذف کار"
      onConfirm={async () => { if (pendingDeletion) await remove.mutateAsync(pendingDeletion) }}/>
  </div>
}
