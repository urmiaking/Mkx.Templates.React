import { fireEvent, render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { PalettePicker, SidebarAppearance } from './ThemeControls'

beforeEach(() => localStorage.clear())

describe('Blazor-style palette picker', () => {
  it('opens the floating sheet, previews both modes and chooses a color', () => {
    const setPalette = vi.fn()
    render(<MemoryRouter>
      <PalettePicker palette="jade" setPalette={setPalette}
        mobilePickerHidden={false} setMobilePickerHidden={vi.fn()}/>
    </MemoryRouter>)

    fireEvent.click(screen.getByRole('button', { name: 'انتخاب رنگ از کنار صفحه' }))
    expect(screen.getByRole('dialog', { name: 'رنگ فضای کار' })).toBeInTheDocument()
    expect(document.querySelectorAll('.palette-preview-light')).toHaveLength(4)
    expect(document.querySelectorAll('.palette-preview-dark')).toHaveLength(4)
    fireEvent.click(screen.getByRole('button', { name: 'بنفش' }))
    expect(setPalette).toHaveBeenCalledWith('iris', expect.any(HTMLElement))
    expect(screen.queryByRole('dialog', { name: 'رنگ فضای کار' })).not.toBeInTheDocument()
  })

  it('persists the draggable tab position and supports keyboard navigation', () => {
    render(<MemoryRouter>
      <PalettePicker palette="jade" setPalette={vi.fn()} mobilePickerHidden={false}
        setMobilePickerHidden={vi.fn()}/>
    </MemoryRouter>)
    const trigger = screen.getByRole('button', { name: 'انتخاب رنگ از کنار صفحه' })
    expect(trigger.closest('.palette-picker-floating')).toHaveStyle({ top: 'calc(50dvh - 28px)' })
    fireEvent.pointerDown(trigger, { pointerId: 1, button: 0, clientY: 300 })
    fireEvent.pointerMove(trigger, { pointerId: 1, clientY: 400 })
    fireEvent.pointerUp(trigger, { pointerId: 1, clientY: 400 })
    expect(Number(localStorage.getItem('Theme.PickerPosition'))).toBeGreaterThan(0.5)
    fireEvent.keyDown(trigger, { key: 'Home' })
    expect(Number(localStorage.getItem('Theme.PickerPosition'))).toBeGreaterThan(0)
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
