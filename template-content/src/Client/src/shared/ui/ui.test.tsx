import {fireEvent, render,screen,waitFor} from '@testing-library/react'
import {describe,expect,it,vi} from 'vitest'
import {useState} from 'react'
import {Field,TextInput} from './Form'
import {OtpField} from './OtpField'
import {DataTable} from './DataTable'
import type {DataColumn} from './DataTable'
import {ConfirmDialog} from './ConfirmDialog'
import {ToastProvider} from './ToastProvider'
import {useToast} from './useToast'
import {Button} from './Button'

describe('Mkx UI',()=>{
 it('labels fields and announces validation errors',()=>{
   render(<Field label="عنوان" hint="راهنما" error="الزامی است">{x=><TextInput id={x.id} aria-invalid={x.invalid} aria-describedby={x.describedBy}/>}</Field>)
   expect(screen.getByRole('textbox',{name:'عنوان'})).toHaveAttribute('aria-invalid','true')
   expect(screen.getByRole('alert')).toHaveTextContent('الزامی است')
 })
 it('accepts Persian digit OTP paste and Backspace',()=>{
   function Example(){const [code,setCode]=useState('');return <><OtpField value={code} onChange={setCode} length={4}/><output>{code}</output></>}
   render(<Example/>)
   fireEvent.paste(screen.getByRole('textbox',{name:'رقم 1 از 4'}),{clipboardData:{getData:()=> '۱۲٣4'}})
   expect(screen.getByText('1234')).toBeInTheDocument()
   for(const [i,digit] of ['۱','۲','۳','۴'].entries())
     expect(screen.getByRole('textbox',{name:'رقم '+(i+1)+' از 4'})).toHaveValue(digit)
   fireEvent.keyDown(screen.getByRole('textbox',{name:'رقم 4 از 4'}),{key:'Backspace'})
   expect(screen.getByText('123')).toBeInTheDocument()
   expect(screen.getByRole('textbox',{name:'رقم 4 از 4'})).toHaveValue('')
   fireEvent.change(screen.getByRole('textbox',{name:'رقم 4 از 4'}),{target:{value:'٥'}})
   expect(screen.getByText('1235')).toBeInTheDocument()
   expect(screen.getByRole('textbox',{name:'رقم 4 از 4'})).toHaveValue('۵')
 })
 it('sorts and paginates typed rows without mutating data',()=>{
   type Row={id:string;name:string;score:number}
   const rows:Row[]=[{id:'a',name:'B',score:3},{id:'b',name:'A',score:1},{id:'c',name:'C',score:2}]
   const cols:DataColumn<Row>[]=[{key:'name',title:'نام',value:r=>r.name},{key:'score',title:'امتیاز',value:r=>r.score,sortable:true}]
   render(<DataTable rows={rows} columns={cols} getRowId={r=>r.id} pageSize={2}/>)
   fireEvent.click(screen.getByRole('button',{name:'مرتب‌سازی امتیاز'}))
   expect(screen.getAllByRole('row')[1]).toHaveTextContent('A')
   fireEvent.click(screen.getByRole('button',{name:/بعدی/}))
   expect(screen.getByText('B')).toBeInTheDocument()
   expect(rows[0].id).toBe('a')
 })
 it('confirms and closes asynchronously',async()=>{
   const action=vi.fn(async()=>{})
   function Example(){const [open,setOpen]=useState(true);return <ConfirmDialog open={open} onOpenChange={setOpen} title="حذف" description="مطمئنید؟" onConfirm={action}/>}
   render(<Example/>)
   fireEvent.click(screen.getByRole('button',{name:'تأیید'}))
   await waitFor(()=>expect(action).toHaveBeenCalledOnce())
   await waitFor(()=>expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument())
 })
 it('renders and dismisses a toast',()=>{
   function Example(){const toast=useToast();return <Button onClick={()=>toast.show('ذخیره شد','success')}>ذخیره</Button>}
   render(<ToastProvider><Example/></ToastProvider>)
   fireEvent.click(screen.getByRole('button',{name:'ذخیره'}))
   expect(screen.getByRole('status')).toHaveTextContent('ذخیره شد')
   fireEvent.click(screen.getByRole('button',{name:'بستن پیام'}))
   expect(screen.queryByText('ذخیره شد')).not.toBeInTheDocument()
 })
})
