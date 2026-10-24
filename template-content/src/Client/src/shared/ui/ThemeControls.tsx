import { useEffect, useRef, useState, type CSSProperties, type PointerEvent } from 'react'
import { Check, Eye, EyeOff, Moon, Palette as PaletteIcon, Sun, X } from 'lucide-react'
import { useLocation } from 'react-router-dom'
import { palettes, type Palette, type Mode } from '../hooks/useTheme'

export type AppearanceControls = {
  mode: Mode
  palette: Palette
  toggle: (source?: HTMLElement | null) => void
  setPalette: (palette: Palette, source?: HTMLElement | null) => void
  mobilePickerHidden: boolean
  setMobilePickerHidden: (hidden: boolean) => void
}

const paletteNames: Record<Palette, string> = {
  jade: 'یشمی',
  ocean: 'آبی',
  iris: 'بنفش',
  amber: 'کهربایی'
}
const positionKey = 'Theme.PickerPosition'
const tabHeight = 56
const panelHeight = 316

function readPosition(): number {
  try {
    const raw = window.localStorage.getItem(positionKey)
    if (raw === null) return 0.5
    const stored = Number(raw)
    return Number.isFinite(stored) && stored >= 0 && stored <= 1 ? stored : 0.5
  } catch { return 0.5 }
}

function savePosition(position: number): void {
  try { window.localStorage.setItem(positionKey, String(position)) } catch { /* Storage is optional. */ }
}

export function ThemeButton({ mode, toggle, className = '' }: Pick<AppearanceControls, 'mode' | 'toggle'> & { className?: string }) {
  const label = mode === 'dark' ? 'تغییر به حالت روشن' : 'تغییر به حالت تاریک'
  return <button className={`icon-button theme-button ${className}`} type="button" aria-label={label} title={label}
    onClick={event => toggle(event.currentTarget)}>
    {mode === 'dark' ? <Sun size={19}/> : <Moon size={19}/>}
  </button>
}

export function SidebarAppearance({ palette, setPalette, mobilePickerHidden, setMobilePickerHidden }: Omit<AppearanceControls, 'mode' | 'toggle'>) {
  return <div className="workspace-sidebar-appearance">
    <div className="palette-quick-options" role="group" aria-label="رنگ فضای کار">
      {palettes.map(color => <button type="button" key={color}
        className="palette-quick-option" data-palette-choice={color} title={paletteNames[color]}
        aria-label={paletteNames[color]} aria-pressed={palette === color}
        onClick={event => setPalette(color, event.currentTarget)}>
        <span className="palette-quick-swatch" aria-hidden="true">{palette === color && <Check size={16}/>}</span>
      </button>)}
    </div>
    <button type="button" className="palette-visibility-toggle" aria-pressed={!mobilePickerHidden}
      title={mobilePickerHidden ? 'نمایش دکمه شناور رنگ' : 'پنهان‌کردن دکمه شناور رنگ'}
      aria-label={mobilePickerHidden ? 'نمایش دکمه شناور رنگ' : 'پنهان‌کردن دکمه شناور رنگ'}
      onClick={() => setMobilePickerHidden(!mobilePickerHidden)}>
      {mobilePickerHidden ? <Eye size={19}/> : <EyeOff size={19}/>}
    </button>
  </div>
}

type Drag = { pointerId: number; startY: number; initial: number; moved: boolean; lastPosition: number }

export function PalettePicker({ palette, setPalette, mobilePickerHidden, setMobilePickerHidden }: Omit<AppearanceControls, 'mode' | 'toggle'>) {
  const [position, setPosition] = useState(readPosition)
  const [open, setOpen] = useState(false)
  const [viewportHeight, setViewportHeight] = useState(() => window.innerHeight)
  const rootRef = useRef<HTMLDivElement>(null)
  const triggerRef = useRef<HTMLButtonElement>(null)
  const dragRef = useRef<Drag | null>(null)
  const location = useLocation()

  useEffect(() => { setOpen(false) }, [location.pathname])
  useEffect(() => {
    const updateViewport = () => setViewportHeight(window.innerHeight)
    window.addEventListener('resize', updateViewport)
    return () => window.removeEventListener('resize', updateViewport)
  }, [])
  useEffect(() => {
    if (!open) return
    const closeOnOutside = (event: PointerEvent | globalThis.PointerEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false)
    }
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') { setOpen(false); triggerRef.current?.focus() }
    }
    document.addEventListener('pointerdown', closeOnOutside)
    document.addEventListener('keydown', closeOnEscape)
    return () => {
      document.removeEventListener('pointerdown', closeOnOutside)
      document.removeEventListener('keydown', closeOnEscape)
    }
  }, [open])

  const centerY = position * viewportHeight
  const maxPanelTop = Math.max(12, viewportHeight - panelHeight - 12)
  const panelTop = Math.max(12, Math.min(maxPanelTop, centerY - 114))
  const originY = Math.max(40, Math.min(panelHeight - 40, centerY - panelTop))
  const sheetStyle = {
    top: panelTop,
    '--palette-origin-y': `${originY}px`
  } as CSSProperties

  const moveTo = (next: number, persist = false) => {
    const ratio = Math.max(tabHeight / 2 / window.innerHeight,
      Math.min(1 - tabHeight / 2 / window.innerHeight, next))
    setPosition(ratio)
    if (persist) savePosition(ratio)
    return ratio
  }

  function onPointerDown(event: PointerEvent<HTMLButtonElement>) {
    if (event.button !== 0) return
    dragRef.current = { pointerId: event.pointerId, startY: event.clientY, initial: position, lastPosition: position, moved: false }
    event.currentTarget.setPointerCapture?.(event.pointerId)
  }
  function onPointerMove(event: PointerEvent<HTMLButtonElement>) {
    const drag = dragRef.current
    if (!drag || drag.pointerId !== event.pointerId) return
    const delta = event.clientY - drag.startY
    if (Math.abs(delta) >= 6) drag.moved = true
    if (drag.moved) { drag.lastPosition = moveTo(drag.initial + delta / window.innerHeight); setOpen(false) }
  }
  function onPointerUp(event: PointerEvent<HTMLButtonElement>) {
    const drag = dragRef.current
    if (!drag || drag.pointerId !== event.pointerId) return
    dragRef.current = null
    if (event.currentTarget.hasPointerCapture?.(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId)
    if (drag.moved) savePosition(drag.lastPosition)
    else setOpen(value => !value)
  }
  function onKeyboard(event: React.KeyboardEvent<HTMLButtonElement>) {
    const delta = 24 / window.innerHeight
    if (event.key === 'ArrowUp') { event.preventDefault(); moveTo(position - delta, true) }
    else if (event.key === 'ArrowDown') { event.preventDefault(); moveTo(position + delta, true) }
    else if (event.key === 'Home') { event.preventDefault(); moveTo(0, true) }
    else if (event.key === 'End') { event.preventDefault(); moveTo(1, true) }
  }

  return <div ref={rootRef} className="palette-picker-floating" data-ready="true" data-mobile-hidden={mobilePickerHidden}
    data-dragging={dragRef.current?.moved || undefined}
    style={{ top: `calc(${position * 100}dvh - ${tabHeight / 2}px)` }}>
    <button ref={triggerRef} type="button" className="palette-edge-tab"
      aria-label="انتخاب رنگ از کنار صفحه" aria-controls="appearance-palette-dialog"
      aria-expanded={open} aria-haspopup="dialog" aria-describedby="palette-drag-hint"
      title="رنگ فضای کار؛ برای جابه‌جایی بالا و پایین بکشید"
      onPointerDown={onPointerDown} onPointerMove={onPointerMove}
      onPointerUp={onPointerUp} onPointerCancel={() => { dragRef.current = null }}
      onKeyDown={onKeyboard} onClick={event => { if (event.detail === 0) setOpen(value => !value) }}>
      <PaletteIcon size={19} aria-hidden="true"/>
    </button>
    <span id="palette-drag-hint" className="sr-only">برای جابه‌جایی بکشید یا از کلیدهای بالا و پایین استفاده کنید.</span>
    {open && <section id="appearance-palette-dialog" className="palette-sheet" style={sheetStyle}
      role="dialog" aria-label="رنگ فضای کار" dir="rtl">
      <svg className="palette-sheet-shape" viewBox="0 0 354 316" preserveAspectRatio="none" aria-hidden="true">
        <path d={`M 35 1 H 335 Q 353 1 353 19 V 297 Q 353 315 335 315 H 35 Q 19 315 19 298 V ${originY + 34} C 19 ${originY + 20} 1 ${originY + 21} 1 ${originY} C 1 ${originY - 21} 19 ${originY - 20} 19 ${originY - 34} V 19 Q 19 1 35 1 Z`} />
      </svg>
      <span className="palette-sheet-mark" style={{top:originY - 12}} aria-hidden="true"><PaletteIcon size={18}/></span>
      <div className="palette-sheet-content">
        <header className="palette-sheet-heading">
          <div><strong>رنگ فضای کار</strong><p>یک رنگ، در روشنایی و تاریکی</p></div>
          <div className="palette-heading-actions">
            <button type="button" className="palette-dismiss palette-mobile-hide" aria-label="پنهان‌کردن دکمه رنگ در موبایل"
              onClick={() => { setOpen(false); setMobilePickerHidden(true) }}><EyeOff size={18}/></button>
            <button type="button" className="palette-dismiss" aria-label="بستن انتخاب رنگ"
              onClick={() => { setOpen(false); triggerRef.current?.focus() }}><X size={18}/></button>
          </div>
        </header>
        <div className="palette-sheet-options" role="group" aria-label="پالت‌های رنگ">
          {palettes.map(color => <button type="button" key={color} className="palette-option"
            data-palette-choice={color} aria-label={paletteNames[color]} aria-pressed={palette === color}
            onClick={event => { setPalette(color, triggerRef.current ?? event.currentTarget); setOpen(false) }}>
            <span className="palette-preview" aria-hidden="true">
              <span className="palette-preview-light"><i/><i/><i/></span>
              <span className="palette-preview-dark"><i/><i/><i/></span>
            </span>
            <span className="palette-option-name">{paletteNames[color]} {palette === color && <Check size={16}/>}</span>
          </button>)}
        </div>
        <span className="sr-only" role="status">رنگ انتخاب‌شده: {paletteNames[palette]}</span>
      </div>
    </section>}
  </div>
}
