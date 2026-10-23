import { useContext } from 'react'
import { ToastContext } from './toast-context'
export function useToast() {
  const toast = useContext(ToastContext)
  if (!toast) throw new Error('useToast must be used within ToastProvider.')
  return toast
}
