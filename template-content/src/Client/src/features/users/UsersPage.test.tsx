import {fireEvent, render, screen, waitFor} from '@testing-library/react'
import {QueryClient, QueryClientProvider} from '@tanstack/react-query'
import {describe,expect,it,vi} from 'vitest'
import {ToastProvider} from '../../shared/ui/ToastProvider'
import {UsersPage} from './UsersPage'

vi.mock('./users.api',async(importOriginal)=>{
  const original=await importOriginal<typeof import('./users.api')>()
  return {...original, usersApi:{
    ...original.usersApi,
    list:vi.fn(async()=>({total:2,items:[
      {id:'1',email:'root@example.com',roles:['Administrators'],directPermissions:[],isLocked:false,emailConfirmed:true},
      {id:'2',email:'member@example.com',roles:['Users'],directPermissions:[],isLocked:false,emailConfirmed:false}
    ]})),
    roles:vi.fn(async()=>[{name:'Users',permissions:[]}])
  }}
})

function mount() {
  const client=new QueryClient({defaultOptions:{queries:{retry:false}}})
  return render(<QueryClientProvider client={client}><ToastProvider>
    <UsersPage canManage canManageClaims currentEmail="root@example.com"/>
  </ToastProvider></QueryClientProvider>)
}

describe('Users administration workspace',()=>{
  it('protects administrator accounts in the interface and shows member actions',async()=>{
    mount()
    await waitFor(()=>expect(screen.getAllByText('root@example.com')[0]).toBeInTheDocument())
    expect(screen.getByText(/این حساب محافظت‌شده است/)).toBeInTheDocument()
    expect(screen.queryByRole('button',{name:'حذف حساب'})).not.toBeInTheDocument()
    fireEvent.click(screen.getByRole('button',{name:/member@example.com/}))
    expect(screen.getByRole('button',{name:'ویرایش ایمیل'})).toBeInTheDocument()
    expect(screen.getByRole('button',{name:'حذف حساب'})).toBeInTheDocument()
  })
  it('shows a responsive create dialog and accessible email/password fields',async()=>{
    mount()
    fireEvent.click(screen.getByRole('button',{name:'کاربر جدید'}))
    expect(screen.getByRole('dialog',{name:'ایجاد کاربر جدید'})).toBeInTheDocument()
    expect(screen.getByRole('textbox',{name:/ایمیل/})).toBeInTheDocument()
    expect(screen.getByLabelText(/رمز اولیه/)).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button',{name:'انصراف'}))
    await waitFor(()=>expect(screen.queryByRole('dialog')).not.toBeInTheDocument())
  })
})
