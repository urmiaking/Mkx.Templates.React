import { useCallback, useEffect, useRef, useState, type CSSProperties, type PointerEvent } from 'react'
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
const tabHeight = 48
const panelHeight = 286

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

// One persistent surface grows out of the compact edge handle. CSS transitions
// interpolate its geometry in both directions; no SVG fins, popup or JS animation loop.
export function PalettePicker({ palette, setPalette, mobilePickerHidden, setMobilePickerHidden }: Omit<AppearanceControls, 'mode' | 'toggle'>) {
  const [position, setPosition] = useState(readPosition)
  const [open, setOpen] = useState(false)
  const [viewportHeight, setViewportHeight] = useState(() => window.innerHeight)
  const [viewportWidth, setViewportWidth] = useState(() => window.innerWidth)
  const rootRef = useRef<HTMLDivElement>(null)
  const triggerRef = useRef<HTMLButtonElement>(null)
  const dragRef = useRef<Drag | null>(null)
  const location = useLocation()
  const closeSheet = useCallback(() => setOpen(false), [])
  const toggleSheet = useCallback(() => setOpen(value => !value), [])

  useEffect(() => { setOpen(false) }, [location.pathname])
  useEffect(() => {
    const updateViewport = () => { setViewportHeight(window.innerHeight); setViewportWidth(window.innerWidth) }
    window.addEventListener('resize', updateViewport)
    return () => window.removeEventListener('resize', updateViewport)
  }, [])
  useEffect(() => {
    if (!open) return
    const closeOnOutside = (event: globalThis.PointerEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) closeSheet()
    }
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') { closeSheet(); triggerRef.current?.focus() }
    }
    document.addEventListener('pointerdown', closeOnOutside)
    document.addEventListener('keydown', closeOnEscape)
    return () => {
      document.removeEventListener('pointerdown', closeOnOutside)
      document.removeEventListener('keydown', closeOnEscape)
    }
  }, [open, closeSheet])

  // The mobile bottom navigation occupies the last 76px of the viewport.
  // Keep the floating tab and its expanded sheet clear of both fixed bars.
  const isIdentityRoute = ['/login', '/login/2fa', '/forgot-password', '/reset-password', '/verify-email'].includes(location.pathname)
  const mobileWorkspace = viewportWidth <= 1020 && !isIdentityRoute
  const topInset = mobileWorkspace ? (viewportWidth <= 680 ? 76 : 90) : 12
  const bottomInset = mobileWorkspace ? 84 : 12
  const minCenter = topInset + tabHeight / 2
  const maxCenter = Math.max(minCenter, viewportHeight - bottomInset - tabHeight / 2)
  const centerY = Math.max(minCenter, Math.min(maxCenter, position * viewportHeight))
  const effectivePanelHeight = Math.min(viewportWidth <= 680 ? 290 : panelHeight,
    Math.max(tabHeight, viewportHeight - topInset - bottomInset))
  const maxPanelTop = Math.max(topInset, viewportHeight - effectivePanelHeight - bottomInset)
  const panelTop = Math.max(topInset, Math.min(maxPanelTop, centerY - effectivePanelHeight / 2))
  const originY = Math.max(tabHeight / 2, Math.min(effectivePanelHeight - tabHeight / 2, centerY - panelTop))
  const pickerStyle = { top: panelTop, height: effectivePanelHeight, '--palette-origin-y': originY + 'px' } as CSSProperties

  const moveTo = (next: number, persist = false) => {
    const desiredCenter = next * window.innerHeight
    const ratio = Math.max(minCenter, Math.min(maxCenter, desiredCenter)) / window.innerHeight
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
    if (drag.moved) { drag.lastPosition = moveTo(drag.initial + delta / window.innerHeight); closeSheet() }
  }
  function onPointerUp(event: PointerEvent<HTMLButtonElement>) {
    const drag = dragRef.current
    if (!drag || drag.pointerId !== event.pointerId) return
    dragRef.current = null
    if (event.currentTarget.hasPointerCapture?.(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId)
    if (drag.moved) savePosition(drag.lastPosition)
    else toggleSheet()
  }
  function onKeyboard(event: React.KeyboardEvent<HTMLButtonElement>) {
    const delta = 24 / window.innerHeight
    if (event.key === 'ArrowUp') { event.preventDefault(); moveTo(position - delta, true) }
    else if (event.key === 'ArrowDown') { event.preventDefault(); moveTo(position + delta, true) }
    else if (event.key === 'Home') { event.preventDefault(); moveTo(0, true) }
    else if (event.key === 'End') { event.preventDefault(); moveTo(1, true) }
  }

  return <div ref={rootRef} className="palette-picker-floating" data-ready="true"
    data-mobile-hidden={mobilePickerHidden} data-dragging={dragRef.current?.moved || undefined}
    data-expanded={open} style={pickerStyle}>
    <div className="palette-liquid-surface">
    <div id="appearance-palette-dialog" className="palette-sheet-content"
      role={open ? 'dialog' : undefined} aria-label="رنگ فضای کار"
      aria-hidden={!open} inert={!open} dir="rtl">
      <header className="palette-sheet-heading">
        <div><strong>رنگ فضای کار</strong><p>یک رنگ، در روشنایی و تاریکی</p></div>
        <div className="palette-heading-actions">
          <button type="button" className="palette-dismiss palette-mobile-hide" aria-label="پنهان‌کردن دکمه رنگ در موبایل"
            onClick={() => { closeSheet(); setMobilePickerHidden(true) }}><EyeOff size={18}/></button>
          <button type="button" className="palette-dismiss" aria-label="بستن انتخاب رنگ"
            onClick={() => { closeSheet(); triggerRef.current?.focus() }}><X size={18}/></button>
        </div>
      </header>
      <div className="palette-sheet-options" role="group" aria-label="پالت‌های رنگ">
        {palettes.map(color => <button type="button" key={color} className="palette-option"
          data-palette-choice={color} aria-label={paletteNames[color]} aria-pressed={palette === color}
          onClick={event => { setPalette(color, triggerRef.current ?? event.currentTarget); closeSheet() }}>
          <span className="palette-preview" aria-hidden="true">
            <span className="palette-preview-light"><i/><i/><i/></span>
            <span className="palette-preview-dark"><i/><i/><i/></span>
          </span>
          <span className="palette-option-name">{paletteNames[color]} {palette === color && <Check size={16}/>}</span>
        </button>)}
      </div>
      <span className="sr-only" role="status">رنگ انتخاب‌شده: {paletteNames[palette]}</span>
    </div>
    </div>
    <button ref={triggerRef} type="button" className="palette-edge-tab"
      aria-label="انتخاب رنگ از کنار صفحه" aria-controls="appearance-palette-dialog"
      aria-expanded={open} aria-haspopup="dialog" aria-describedby="palette-drag-hint"
      title="رنگ فضای کار؛ برای جابه‌جایی بالا و پایین بکشید"
      onPointerDown={onPointerDown} onPointerMove={onPointerMove}
      onPointerUp={onPointerUp} onPointerCancel={() => { dragRef.current = null }}
      onKeyDown={onKeyboard} onClick={event => { if (event.detail === 0) toggleSheet() }}>
      <PaletteIcon size={18} aria-hidden="true"/>
    </button>
    <span id="palette-drag-hint" className="sr-only">برای جابه‌جایی بکشید یا از کلیدهای بالا و پایین استفاده کنید.</span>
  </div>
}
