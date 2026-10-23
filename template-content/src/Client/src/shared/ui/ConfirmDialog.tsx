import { useState } from 'react'
import * as Primitive from '@radix-ui/react-alert-dialog'
import { AlertTriangle, X } from 'lucide-react'
import { Button } from './Button'

type Props = {
  open: boolean
  onOpenChange: (open: boolean) => void
  title: string
  description: string
  onConfirm: () => void | Promise<void>
  confirmLabel?: string
  cancelLabel?: string
  destructive?: boolean
}

export function ConfirmDialog({open, onOpenChange, title, description, onConfirm,
  confirmLabel = 'تأیید', cancelLabel = 'انصراف', destructive = false}: Props) {
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  async function handleConfirm() {
    setBusy(true)
    setError('')
    try {
      await onConfirm()
      onOpenChange(false)
    } catch {
      setError('انجام عملیات ناموفق بود. دوباره تلاش کنید.')
    } finally {
      setBusy(false)
    }
  }
  return <Primitive.Root open={open} onOpenChange={value => { if (!busy) { setError(''); onOpenChange(value) } }}>
    <Primitive.Portal>
      <Primitive.Overlay className="ui-overlay"/>
      <Primitive.Content className="ui-dialog ui-dialog--sm">
        <header className="ui-dialog__header">
          <div className="ui-confirm-heading">
            <span className={'ui-confirm-symbol ' + (destructive ? 'ui-confirm-symbol--danger' : '')}><AlertTriangle size={21}/></span>
            <div>
              <Primitive.Title className="ui-dialog__title">{title}</Primitive.Title>
              <Primitive.Description className="ui-dialog__description">{description}</Primitive.Description>
            </div>
          </div>
          <Primitive.Cancel className="ui-icon-action" disabled={busy} aria-label="بستن"><X size={18}/></Primitive.Cancel>
        </header>
        {error && <p className="ui-field-error" role="alert">{error}</p>}
        <footer className="ui-dialog__footer">
          <Primitive.Cancel className="button button--secondary" disabled={busy}>{cancelLabel}</Primitive.Cancel>
          <Button type="button" variant={destructive ? 'danger' : 'primary'} disabled={busy} onClick={() => void handleConfirm()}>
            {busy ? 'در حال انجام...' : confirmLabel}
          </Button>
        </footer>
      </Primitive.Content>
    </Primitive.Portal>
  </Primitive.Root>
}
