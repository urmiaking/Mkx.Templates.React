import { useCallback, useRef, useState, useEffect } from 'react'
import type { ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { CheckCircle2, Info, AlertCircle, X } from 'lucide-react'
import { ToastContext } from './toast-context'
import type { ToastItem, ToastTone } from './toast-context'

function ToastMessage({item, dismiss}: {item: ToastItem; dismiss: (id: number) => void}) {
  useEffect(() => {
    const timer = window.setTimeout(() => dismiss(item.id), 4500)
    return () => window.clearTimeout(timer)
  },[item.id,dismiss])
  return <article className={'ui-toast ui-toast--'+item.tone} role={item.tone === 'error' ? 'alert' : 'status'}>
    {item.tone === 'success' ? <CheckCircle2 size={20}/> : item.tone === 'error' ? <AlertCircle size={20}/> : <Info size={20}/>}
    <span>{item.message}</span>
    <button className="ui-icon-action" type="button" aria-label="بستن پیام" onClick={() => dismiss(item.id)}><X size={16}/></button>
  </article>
}

export function ToastProvider({children}: {children: ReactNode}) {
  const [items,setItems] = useState<ToastItem[]>([])
  const nextId = useRef(0)
  const show = useCallback((message: string, tone: ToastTone = 'info') => {
    setItems(old => [...old.slice(-3),{id: ++nextId.current,message,tone}])
  },[])
  const dismiss = useCallback((id: number) => setItems(old => old.filter(item => item.id!==id)),[])
  return <ToastContext.Provider value={{show,dismiss}}>
    {children}
    {typeof document !== 'undefined' && createPortal(<div className="ui-toaster" aria-label="اعلان‌ها">
      {items.map(item => <ToastMessage key={item.id} item={item} dismiss={dismiss}/>)}
    </div>,document.body)}
  </ToastContext.Provider>
}
