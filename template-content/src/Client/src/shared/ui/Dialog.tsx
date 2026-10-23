import type { ReactNode } from 'react'
import * as Primitive from '@radix-ui/react-dialog'
import { X } from 'lucide-react'

export type DialogProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  title: string
  description?: string
  children: ReactNode
  footer?: ReactNode
  size?: 'sm' | 'md' | 'lg'
}

export function Dialog({ open, onOpenChange, title, description, children, footer, size = 'md' }: DialogProps) {
  return <Primitive.Root open={open} onOpenChange={onOpenChange}>
    <Primitive.Portal>
      <Primitive.Overlay className="ui-overlay"/>
      <Primitive.Content className={'ui-dialog ui-dialog--' + size}>
        <header className="ui-dialog__header">
          <div>
            <Primitive.Title className="ui-dialog__title">{title}</Primitive.Title>
            {description && <Primitive.Description className="ui-dialog__description">{description}</Primitive.Description>}
          </div>
          <Primitive.Close className="ui-icon-action" aria-label="بستن"><X size={18}/></Primitive.Close>
        </header>
        <div className="ui-dialog__body">{children}</div>
        {footer && <footer className="ui-dialog__footer">{footer}</footer>}
      </Primitive.Content>
    </Primitive.Portal>
  </Primitive.Root>
}
