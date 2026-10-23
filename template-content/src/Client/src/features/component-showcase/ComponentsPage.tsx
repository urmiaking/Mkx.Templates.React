import { useState } from 'react'
import { Layers3, Plus, Bell, Trash2, ShieldCheck, Table2, KeyRound, SlidersHorizontal, CheckCircle2, Sparkles } from 'lucide-react'
import { Button } from '../../shared/ui/Button'
import { Card } from '../../shared/ui/Card'
import { Dialog } from '../../shared/ui/Dialog'
import { ConfirmDialog } from '../../shared/ui/ConfirmDialog'
import { Field, Form, TextInput, TextArea, CheckBox } from '../../shared/ui/Form'
import { Select } from '../../shared/ui/Select'
import { OtpField } from '../../shared/ui/OtpField'
import { DataTable } from '../../shared/ui/DataTable'
import type { DataColumn } from '../../shared/ui/DataTable'
import { useToast } from '../../shared/ui/useToast'

type DemoRow = {id: string; name: string; category: string; status: string; amount: number}
const demoRows: DemoRow[] = [
  {id:'1',name:'راه‌اندازی داشبورد',category:'Frontend',status:'تکمیل',amount:87},
  {id:'2',name:'تست API',category:'Backend',status:'در جریان',amount:52},
  {id:'3',name:'مدیریت کاربران',category:'Identity',status:'تکمیل',amount:93},
  {id:'4',name:'کامپوننت OTP',category:'Frontend',status:'در جریان',amount:61},
  {id:'5',name:'یکپارچه‌سازی اعلان‌ها',category:'Frontend',status:'برنامه‌ریزی',amount:20},
  {id:'6',name:'انتشار خودکار NuGet',category:'DevOps',status:'تکمیل',amount:100},
  {id:'7',name:'لاگ‌گیری',category:'Backend',status:'برنامه‌ریزی',amount:10}
]
const columns: DataColumn<DemoRow>[] = [
  {key:'name',title:'عنوان',value: r=>r.name,sortable:true,cell:r=><strong>{r.name}</strong>},
  {key:'category',title:'بخش',value:r=>r.category,sortable:true,cell:r=><span className="ui-tag">{r.category}</span>},
  {key:'status',title:'وضعیت',value:r=>r.status,sortable:true},
  {key:'amount',title:'پیشرفت',value:r=>r.amount,sortable:true,cell:r=><span className="ui-number">{r.amount}٪</span>}
]

export function ComponentsPage() {
  const toast = useToast()
  const [dialogOpen,setDialogOpen] = useState(false)
  const [confirmOpen,setConfirmOpen] = useState(false)
  const [name,setName] = useState('')
  const [notes,setNotes] = useState('')
  const [category,setCategory] = useState('')
  const [enabled,setEnabled] = useState(true)
  const [otp,setOtp] = useState('')
  const [error,setError] = useState('')
  function save(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (name.trim().length < 3) {setError('حداقل سه کاراکتر وارد کنید.'); return}
    setError('')
    setDialogOpen(false)
    toast.show('نمونه فرم با موفقیت اعتبارسنجی شد.', 'success')
  }
  return <div className="page ui-showcase motion-enter">
    <div className="ui-showcase__top">
      <div><p className="eyebrow">Mkx Design System · Phase 1</p><h1>کتابخانه کامپوننت‌ها</h1>
        <p className="muted">کامپوننت‌های سبک، قابل استفاده مجدد، سازگار با موبایل، راست‌به‌چپ و چهار پالت رنگی</p></div>
      <span className="count-pill"><Layers3 size={16}/> UI Foundations</span>
    </div>

    <div className="ui-showcase-grid">
      <Card className="ui-demo-card">
        <div className="ui-demo-head"><span className="ui-demo-icon"><SlidersHorizontal size={20}/></span><div><h2>دکمه‌ها و عملیات</h2><p>رنگ‌های معنایی و وضعیت‌های تعامل</p></div></div>
        <div className="ui-demo-actions">
          <Button onClick={()=>setDialogOpen(true)}><Plus size={17}/> باز کردن فرم</Button>
          <Button variant="secondary" onClick={()=>toast.show('این یک پیام اطلاع‌رسانی است.')}><Bell size={17}/> اعلان</Button>
          <Button variant="danger" onClick={()=>setConfirmOpen(true)}><Trash2 size={17}/> حذف</Button>
          <Button variant="ghost" onClick={()=>toast.show('عملیات با موفقیت انجام شد.','success')}><CheckCircle2 size={17}/> موفقیت</Button>
        </div>
        <div className="ui-demo-tip"><Sparkles size={17}/> کلید Escape، مدیریت Focus و تله فوکوس Dialog را امتحان کنید.</div>
      </Card>

      <Card className="ui-demo-card">
        <div className="ui-demo-head"><span className="ui-demo-icon"><ShieldCheck size={20}/></span><div><h2>فیلدها و انتخابگرها</h2><p>خطا، توضیحات و وضعیت قابل‌دسترسی</p></div></div>
        <div className="ui-demo-stack">
          <Field label="نام پروژه" required hint="یک نام قابل شناسایی برای محصول" error={error}>
            {field=><TextInput id={field.id} aria-invalid={field.invalid} aria-describedby={field.describedBy}
              required value={name} onChange={e=>{setName(e.target.value);setError('')}} placeholder="مثلاً سامانه مدیریت جلسات"/>}
          </Field>
          <Select label="دسته‌بندی" options={[{value:'web',label:'اپلیکیشن تحت وب'}, {value:'internal',label:'سیستم سازمانی'}, {value:'pwa',label:'PWA'}]}
            value={category} onValueChange={setCategory} />
          <CheckBox checked={enabled} onChange={event=>setEnabled(event.target.checked)} label="فعال‌بودن گزینه نمونه"/>
        </div>
      </Card>

      <Card className="ui-demo-card">
        <div className="ui-demo-head"><span className="ui-demo-icon"><KeyRound size={20}/></span><div><h2>ورود با کد یک‌بارمصرف</h2><p>چسباندن کد، ارقام فارسی و ناوبری صفحه‌کلید</p></div></div>
        <div className="ui-otp-demo">
          <OtpField value={otp} onChange={setOtp}/>
          <p className="muted">برای نمونه یک کد شش‌رقمی وارد کنید.</p>
          <span className={'ui-otp-state ' + (otp.length===6?'complete':'')}>
            {otp.length===6 ? 'کد شش‌رقمی کامل شد' : `${otp.length} رقم از ۶ رقم`}
          </span>
          {otp && <Button variant="ghost" onClick={()=>setOtp('')}>پاک‌کردن</Button>}
        </div>
      </Card>

      <Card className="ui-demo-card ui-demo-card--wide">
        <div className="ui-demo-head"><span className="ui-demo-icon"><Table2 size={20}/></span><div><h2>جدول داده‌ها</h2><p>مرتب‌سازی، صفحه‌بندی، حالت خالی و اسکرول افقی در موبایل</p></div></div>
        <DataTable rows={demoRows} columns={columns} getRowId={r=>r.id} pageSize={5} caption="وظایف نمونه"/>
      </Card>
    </div>

    <Dialog open={dialogOpen} onOpenChange={setDialogOpen} title="ثبت پروژه نمونه" description="تست فرم، خطاها و نمایش دیالوگ در اندازه‌های مختلف"
      footer={<><Button variant="secondary" onClick={()=>setDialogOpen(false)}>انصراف</Button><Button type="submit" form="design-demo-form">ذخیره اطلاعات</Button></>}>
      <Form id="design-demo-form" onSubmit={save} className="ui-demo-stack">
        <Field label="نام پروژه" required error={error}>{field=><TextInput id={field.id} aria-describedby={field.describedBy}
          aria-invalid={field.invalid} value={name} required onChange={e=>{setName(e.target.value);setError('')}} placeholder="نام را وارد کنید"/>}</Field>
        <Select label="نوع پروژه" value={category} onValueChange={setCategory}
          options={[{value:'web',label:'اپلیکیشن وب'},{value:'internal',label:'سامانه سازمانی'},{value:'pwa',label:'اپلیکیشن PWA'}]}/>
        <Field label="توضیحات" hint="اختیاری">{field=><TextArea rows={3} id={field.id} aria-describedby={field.describedBy}
          value={notes} onChange={e=>setNotes(e.target.value)} placeholder="درباره پروژه..." />}</Field>
      </Form>
    </Dialog>
    <ConfirmDialog open={confirmOpen} onOpenChange={setConfirmOpen} destructive
      title="حذف اطلاعات نمونه؟" description="این فقط یک پیش‌نمایش است و هیچ داده واقعی حذف نخواهد شد."
      confirmLabel="حذف نمونه" onConfirm={()=>toast.show('در این پیش‌نمایش داده‌ای حذف نشد.','success')}/>
  </div>
}
