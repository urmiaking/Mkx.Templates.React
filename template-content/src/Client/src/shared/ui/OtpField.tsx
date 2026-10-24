import { useRef } from 'react'
import type { ClipboardEvent, KeyboardEvent } from 'react'

type Props = {value: string; onChange: (value: string) => void; length?: number; disabled?: boolean; label?: string; autoFocus?: boolean}
function normalizeDigits(input: string) {
  return input.replace(/[۰-۹]/g, x => String(x.charCodeAt(0) - 1776))
    .replace(/[٠-٩]/g, x => String(x.charCodeAt(0) - 1632)).replace(/\D/g,'')
}
const persianDigits = '۰۱۲۳۴۵۶۷۸۹'
const displayDigit = (digit: string) => persianDigits[Number(digit)] ?? ''

export function OtpField({value, onChange, length = 6, disabled, label = 'کد یک‌بار مصرف', autoFocus}: Props) {
  const refs = useRef<Array<HTMLInputElement|null>>([])
  const digits = normalizeDigits(value).slice(0,length)
  function insert(index: number, text: string) {
    const added = normalizeDigits(text)
    if (!added) return
    const slots = digits.padEnd(length, ' ').split('')
    for (let i=0;i<added.length && i+index<length;i++) slots[i+index]=added[i]
    onChange(slots.join('').trimEnd())
    refs.current[Math.min(length-1,index+added.length)]?.focus()
  }
  function onKey(event: KeyboardEvent<HTMLInputElement>,index: number) {
    if (event.key === 'Backspace') {
      event.preventDefault()
      const target = digits[index] ? index : Math.max(0,index-1)
      const next = digits.split('')
      next.splice(target,1)
      onChange(next.join(''))
      refs.current[target]?.focus()
    } else if (event.key === 'ArrowLeft' || event.key === 'ArrowRight') {
      event.preventDefault()
      const delta = event.key === 'ArrowLeft' ? 1 : -1
      refs.current[Math.max(0,Math.min(length-1,index+delta))]?.focus()
    }
  }
  function paste(event: ClipboardEvent<HTMLInputElement>,index: number) {
    event.preventDefault()
    insert(index,event.clipboardData.getData('text'))
  }
  return <div className="ui-otp" role="group" aria-label={label} dir="ltr">
    {Array.from({length},(_,index)=><input key={index}
      ref={node => { refs.current[index]=node }}
      className="ui-otp__digit"
      value={digits[index] ? displayDigit(digits[index]) : ''}
      onChange={event => { const next = normalizeDigits(event.target.value); if (next) insert(index,next); else { const copy=digits.split(''); copy.splice(index,1); onChange(copy.join('')) } }}
      onPaste={event => paste(event,index)}
      onKeyDown={event => onKey(event,index)}
      aria-label={`رقم ${index+1} از ${length}`}
      type="text" inputMode="numeric"
      autoComplete={index===0?'one-time-code':'off'}
      maxLength={length} disabled={disabled} autoFocus={autoFocus && index===0}
    />)}
  </div>
}
