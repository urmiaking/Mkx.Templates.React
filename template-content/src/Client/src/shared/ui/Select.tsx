import { useId } from 'react'
import * as Primitive from '@radix-ui/react-select'
import { Check, ChevronDown, ChevronUp } from 'lucide-react'

export type SelectOption = {value: string; label: string; disabled?: boolean}
export type SelectProps = {
  value: string
  onValueChange: (value: string) => void
  options: SelectOption[]
  label?: string
  placeholder?: string
  id?: string
  disabled?: boolean
  required?: boolean
  error?: string
}
export function Select({value, onValueChange, options, label, placeholder = 'انتخاب کنید', id, disabled, required, error}: SelectProps) {
  const generated = useId()
  const fieldId = id || generated
  const errorId = error ? fieldId + '-error' : undefined
  return <div className="ui-field">
    {label && <label className="ui-field__label" htmlFor={fieldId}>{label}{required && <span className="ui-required"> *</span>}</label>}
    <Primitive.Root value={value || undefined} onValueChange={onValueChange} disabled={disabled} required={required}>
      <Primitive.Trigger id={fieldId} className="ui-select-trigger" aria-invalid={Boolean(error)} aria-describedby={errorId}>
        <Primitive.Value placeholder={placeholder}/>
        <Primitive.Icon><ChevronDown size={17}/></Primitive.Icon>
      </Primitive.Trigger>
      <Primitive.Portal>
        <Primitive.Content className="ui-select-content" position="popper" sideOffset={6} collisionPadding={10}>
          <Primitive.ScrollUpButton className="ui-select-scroll"><ChevronUp size={16}/></Primitive.ScrollUpButton>
          <Primitive.Viewport className="ui-select-viewport">
            {options.map(option => <Primitive.Item key={option.value} value={option.value} disabled={option.disabled} className="ui-select-item">
              <Primitive.ItemText>{option.label}</Primitive.ItemText>
              <Primitive.ItemIndicator className="ui-select-indicator"><Check size={16}/></Primitive.ItemIndicator>
            </Primitive.Item>)}
          </Primitive.Viewport>
          <Primitive.ScrollDownButton className="ui-select-scroll"><ChevronDown size={16}/></Primitive.ScrollDownButton>
        </Primitive.Content>
      </Primitive.Portal>
    </Primitive.Root>
    {error && <p className="ui-field-error" role="alert" id={errorId}>{error}</p>}
  </div>
}
