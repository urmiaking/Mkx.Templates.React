import { useEffect, useRef, useState } from 'react'
import { Bell, BellOff, X } from 'lucide-react'
import { useQuery } from '@tanstack/react-query'
import { pushApi } from './push.api'
import { disablePush, enablePush, getPushState, restoreGrantedPush } from './browser-push'
import type { PushState } from './browser-push'
import './push.css'

export function PushControl({ authenticated }: { authenticated: boolean }) {
  const [open, setOpen] = useState(false)
  const [state, setState] = useState<PushState | null>(null)
  const [pending, setPending] = useState(false)
  const [error, setError] = useState('')
  const panelRef = useRef<HTMLDivElement>(null)
  const triggerRef = useRef<HTMLButtonElement>(null)
  const config = useQuery({
    queryKey: ['push-configuration'], queryFn: pushApi.configuration,
    enabled: authenticated, retry: false, staleTime: 300_000
  })
  useEffect(() => {
    if (!authenticated || !config.data?.enabled || !config.data.publicKey) return
    let canceled = false
    // Never prompt without a click: rebind an already-granted subscription only.
    void restoreGrantedPush(config.data.publicKey).catch(() => {}).then(async () => {
      if (!canceled) {
        const latest = await getPushState().catch(() => null)
        if (!canceled) setState(latest)
      }
    })
    return () => { canceled = true }
  }, [authenticated, config.data?.enabled, config.data?.publicKey])
  useEffect(() => {
    if (!open) return
    const onEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') { setOpen(false); triggerRef.current?.focus() }
    }
    const onOutside = (event: PointerEvent) => {
      if (panelRef.current && !panelRef.current.contains(event.target as Node)) setOpen(false)
    }
    document.addEventListener('keydown', onEscape)
    document.addEventListener('pointerdown', onOutside)
    return () => { document.removeEventListener('keydown', onEscape); document.removeEventListener('pointerdown', onOutside) }
  }, [open])
  if (!authenticated) return null
  const description = config.isPending ? 'در حال بررسی تنظیمات…'
    : !config.data?.enabled ? 'ارسال اعلان روی سرور تنظیم نشده است.'
      : !state?.supported ? 'مرورگر یا اتصال فعلی از اعلان پشتیبانی نمی‌کند.'
        : state.permission === 'denied' ? 'مجوز اعلان از تنظیمات مرورگر مسدود شده است.'
          : state.subscribed ? 'اعلان‌های این دستگاه فعال هستند.'
            : 'برای دریافت اعلان حتی هنگام بسته بودن برنامه فعال کنید.'
  const toggle = async () => {
    if (pending || !config.data?.publicKey) return
    setPending(true); setError('')
    try {
      if (state?.subscribed) await disablePush()
      else await enablePush(config.data.publicKey)
      setState(await getPushState())
    } catch {
      setError('تغییر وضعیت اعلان‌ها ناموفق بود. دوباره تلاش کنید.')
      setState(await getPushState().catch(() => null))
    } finally { setPending(false) }
  }
  return <div className="push-control" ref={panelRef}>
    <button ref={triggerRef} type="button" className="icon-button" aria-label="اعلان‌ها"
      aria-controls="push-device-panel" aria-expanded={open} onClick={() => setOpen(v => !v)}>
      <Bell size={19}/>
    </button>
    {open && <section className="push-panel" id="push-device-panel" aria-label="اعلان‌های مرورگر">
      <div className="push-panel__header"><strong>اعلان‌های دستگاه</strong>
        <button className="icon-button" type="button" aria-label="بستن پنل اعلان" onClick={() => { setOpen(false); triggerRef.current?.focus() }}><X size={18}/></button>
      </div>
      <p>{description}</p>
      {error && <p role="alert" className="push-panel__error">{error}</p>}
      {config.data?.enabled && state?.supported && <button type="button" className="button button--secondary"
        disabled={pending || state.permission === 'denied'} onClick={() => void toggle()}>
        {state.subscribed ? <BellOff size={17}/> : <Bell size={17}/>}
        {pending ? 'در حال انجام…' : state.subscribed ? 'غیرفعال‌سازی' : 'فعال‌سازی'}
      </button>}
    </section>}
  </div>
}
