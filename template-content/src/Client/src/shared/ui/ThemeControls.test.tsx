import { fireEvent, render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { PalettePicker, SidebarAppearance } from './ThemeControls'

beforeEach(() => localStorage.clear())

describe('one-piece palette picker', () => {
  it('expands the same compact surface, shows both preview modes and chooses a color', () => {
    const setPalette = vi.fn()
    render(<MemoryRouter>
      <PalettePicker palette="jade" setPalette={setPalette}
        mobilePickerHidden={false} setMobilePickerHidden={vi.fn()}/>
    </MemoryRouter>)

    const surface = document.querySelector('.palette-liquid-surface')
    expect(surface).toBeInTheDocument()
    expect(document.querySelector('.palette-sheet-shape')).not.toBeInTheDocument()
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: 'انتخاب رنگ از کنار صفحه' }))
    expect(screen.getByRole('dialog', { name: 'رنگ فضای کار' })).toBeInTheDocument()
    expect(document.querySelector('.palette-liquid-surface')).toBe(surface)
    expect(document.querySelectorAll('.palette-preview-light')).toHaveLength(4)
    expect(document.querySelectorAll('.palette-preview-dark')).toHaveLength(4)

    fireEvent.click(screen.getByRole('button', { name: 'بنفش' }))
    expect(setPalette).toHaveBeenCalledWith('iris', expect.any(HTMLElement))
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    expect(document.querySelector('.palette-liquid-surface')).toBe(surface)
  })

  it('can close, instantly reopen, and close by Escape without creating a second sheet', () => {
    render(<MemoryRouter><PalettePicker palette="jade" setPalette={vi.fn()}
      mobilePickerHidden={false} setMobilePickerHidden={vi.fn()}/></MemoryRouter>)
    const trigger = screen.getByRole('button', { name: 'انتخاب رنگ از کنار صفحه' })
    const surface = document.querySelector('.palette-liquid-surface')
    fireEvent.click(trigger)
    expect(trigger).toHaveAttribute('aria-expanded','true')
    fireEvent.click(screen.getByRole('button', { name: 'بستن انتخاب رنگ' }))
    expect(trigger).toHaveAttribute('aria-expanded','false')
    fireEvent.click(trigger)
    expect(trigger).toHaveAttribute('aria-expanded','true')
    expect(document.querySelector('.palette-liquid-surface')).toBe(surface)
    expect(document.querySelectorAll('.palette-liquid-surface')).toHaveLength(1)
    fireEvent.keyDown(document, { key: 'Escape' })
    expect(trigger).toHaveAttribute('aria-expanded','false')
  })

  it('persists the draggable position and supports keyboard movement', () => {
    render(<MemoryRouter>
      <PalettePicker palette="jade" setPalette={vi.fn()} mobilePickerHidden={false}
        setMobilePickerHidden={vi.fn()}/>
    </MemoryRouter>)
    const trigger = screen.getByRole('button', { name: 'انتخاب رنگ از کنار صفحه' })
    expect(trigger.closest('.palette-picker-floating')).toHaveStyle({ top: `${window.innerHeight * 0.5 - 143}px` })
    fireEvent.pointerDown(trigger, { pointerId: 1, button: 0, clientY: 300 })
    fireEvent.pointerMove(trigger, { pointerId: 1, clientY: 400 })
    fireEvent.pointerUp(trigger, { pointerId: 1, clientY: 400 })
    expect(Number(localStorage.getItem('Theme.PickerPosition'))).toBeGreaterThan(0.5)
    fireEvent.keyDown(trigger, { key: 'Home' })
    expect(Number(localStorage.getItem('Theme.PickerPosition'))).toBeGreaterThan(0)
  })

  it('re-centers the same panel and neck when switching to a phone-width viewport', () => {
    const previousWidth = window.innerWidth
    render(<MemoryRouter><PalettePicker palette="jade" setPalette={vi.fn()}
      mobilePickerHidden={false} setMobilePickerHidden={vi.fn()}/></MemoryRouter>)
    const picker = document.querySelector('.palette-picker-floating')
    expect(picker).toHaveStyle({ top: `${window.innerHeight * 0.5 - 143}px` })
    try {
      Object.defineProperty(window, 'innerWidth', { configurable: true, value: 320 })
      fireEvent.resize(window)
      expect(picker).toHaveStyle({ top: `${window.innerHeight * 0.5 - 145}px` })
      expect(document.querySelectorAll('.palette-liquid-surface')).toHaveLength(1)
    } finally {
      Object.defineProperty(window, 'innerWidth', { configurable: true, value: previousWidth })
      fireEvent.resize(window)
    }
  })

  it('provides mobile quick swatches and a visibility toggle', () => {
    const setPalette = vi.fn()
    const setMobilePickerHidden = vi.fn()
    render(<SidebarAppearance palette="jade" setPalette={setPalette}
      mobilePickerHidden={true} setMobilePickerHidden={setMobilePickerHidden}/>)
    fireEvent.click(screen.getByRole('button', { name: 'آبی' }))
    expect(setPalette).toHaveBeenCalledWith('ocean', expect.any(HTMLElement))
    fireEvent.click(screen.getByRole('button', { name: 'نمایش دکمه شناور رنگ' }))
    expect(setMobilePickerHidden).toHaveBeenCalledWith(false)
  })
})
