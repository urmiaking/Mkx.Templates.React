import { act, renderHook } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { revealAppearance, useTheme } from './useTheme'

const root = document.documentElement

beforeEach(() => {
  localStorage.clear()
  root.removeAttribute('data-theme')
  root.removeAttribute('data-palette')
  root.removeAttribute('data-theme-transition')
})

afterEach(() => {
  Reflect.deleteProperty(document, 'startViewTransition')
  Reflect.deleteProperty(root, 'animate')
  vi.restoreAllMocks()
})

describe('animated theme behavior', () => {
  it('persists the mobile floating-control visibility independently of the palette', () => {
    const { result } = renderHook(() => useTheme())
    act(() => result.current.setMobilePickerHidden(true))
    expect(result.current.mobilePickerHidden).toBe(true)
    expect(localStorage.getItem('Theme.MobilePickerHidden')).toBe('true')
    expect(localStorage.getItem('Theme.Palette')).toBe('jade')
  })

  it('expands the new snapshot for palette changes from the invoking control', async () => {
    const source = document.createElement('button')
    vi.spyOn(source, 'getBoundingClientRect').mockReturnValue({
      x: 60, y: 80, width: 40, height: 40, left: 60, top: 80, right: 100, bottom: 120,
      toJSON: () => ({})
    })
    const animation = { finished: Promise.resolve(), cancel: vi.fn() }
    const animate = vi.fn().mockReturnValue(animation)
    Object.defineProperty(root, 'animate', { value: animate, configurable: true })
    Object.defineProperty(document, 'startViewTransition', {
      value: (apply: () => void) => {
        apply()
        return { ready: Promise.resolve(), finished: Promise.resolve(), skipTransition: vi.fn() }
      },
      configurable: true
    })
    const apply = vi.fn(() => { root.dataset.palette = 'iris' })
    await revealAppearance(apply, source, 'palette')

    expect(apply).toHaveBeenCalledOnce()
    expect(animate).toHaveBeenCalledOnce()
    expect(animate.mock.calls[0][0].clipPath[0]).toBe('circle(0px at 80px 100px)')
    expect(animate.mock.calls[0][1]).toMatchObject({
      duration: 800, pseudoElement: '::view-transition-new(root)', fill: 'both'
    })
    expect(animation.cancel).toHaveBeenCalledOnce()
    expect(root.dataset.themeTransition).toBeUndefined()
  })

  it('contracts the old snapshot when switching to light', async () => {
    const source = document.createElement('button')
    const animate = vi.fn().mockReturnValue({ finished: Promise.resolve(), cancel: vi.fn() })
    Object.defineProperty(root, 'animate', { value: animate, configurable: true })
    Object.defineProperty(document, 'startViewTransition', {
      value: (apply: () => void) => {
        apply()
        return { ready: Promise.resolve(), finished: Promise.resolve(), skipTransition: vi.fn() }
      },
      configurable: true
    })
    await revealAppearance(() => { root.dataset.theme = 'light' }, source, 'radial', true)
    expect(animate.mock.calls[0][1].pseudoElement).toBe('::view-transition-old(root)')
    expect(animate.mock.calls[0][0].clipPath[1]).toMatch(/^circle\(0px at /)
  })

  it('updates instantly without the native API', async () => {
    const apply = vi.fn()
    await revealAppearance(apply, document.createElement('button'), 'radial')
    expect(apply).toHaveBeenCalledOnce()
    expect(root.dataset.themeTransition).toBeUndefined()
  })
})
