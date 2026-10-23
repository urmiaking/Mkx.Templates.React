import { useId } from 'react'
import type { FormEventHandler, FormHTMLAttributes, InputHTMLAttributes, ReactNode, TextareaHTMLAttributes } from 'react'

export function Form({busy = false, ...props}: FormHTMLAttributes<HTMLFormElement> & {onSubmit: FormEventHandler<HTMLFormElement>; busy?: boolean}) {
  return <form aria-busy={busy} {...props}/>
}

type FieldProps = {
  label: string
  id?: string
  required?: boolean
  hint?: string
  error?: string
  children: (args: {id: string; describedBy?: string; invalid: boolean}) => ReactNode
}

export function Field({label, id, required, hint, error, children}: FieldProps) {
  const generatedId = useId()
  const fieldId = id ?? generatedId
  const hintId = hint ? fieldId + '-hint' : undefined
  const errorId = error ? fieldId + '-error' : undefined
  return <div className="ui-field">
    <label className="ui-field__label" htmlFor={fieldId}>{label}{required && <span className="ui-required" aria-hidden="true"> *</span>}</label>
    {children({id: fieldId, describedBy: [hintId,errorId].filter(Boolean).join(' ') || undefined, invalid: Boolean(error)})}
    {hint && <p className="ui-field__hint" id={hintId}>{hint}</p>}
    {error && <p className="ui-field-error" role="alert" id={errorId}>{error}</p>}
  </div>
}

export function TextInput({className = '', ...props}: InputHTMLAttributes<HTMLInputElement>) {
  return <input className={'ui-input ' + className} {...props}/>
}

export function TextArea({className = '', ...props}: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea className={'ui-textarea ' + className} {...props}/>
}

export function CheckBox({label, ...props}: Omit<InputHTMLAttributes<HTMLInputElement>,'type'> & {label: string}) {
  return <label className="ui-check"><input type="checkbox" {...props}/><span>{label}</span></label>
}
