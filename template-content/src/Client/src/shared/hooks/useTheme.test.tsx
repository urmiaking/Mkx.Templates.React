import { act, renderHook } from '@testing-library/react'
import { beforeEach, describe, expect, it } from 'vitest'
import { useTheme } from './useTheme'

beforeEach(() => {
  localStorage.clear()
  document.documentElement.removeAttribute('data-theme')
  document.documentElement.removeAttribute('data-palette')
})

describe('appearance preferences', () => {
  it('persists light/dark and palettes independently', () => {
    localStorage.setItem('Theme.Mode', 'light')
    const { result } = renderHook(() => useTheme())
    expect(result.current.mode).toBe('light')
    expect(result.current.palette).toBe('jade')
    act(() => result.current.setPalette('iris'))
    expect(document.documentElement.dataset.palette).toBe('iris')
    expect(localStorage.getItem('Theme.Mode')).toBe('light')
    act(() => result.current.toggle())
    expect(document.documentElement.dataset.theme).toBe('dark')
    expect(localStorage.getItem('Theme.Palette')).toBe('iris')
  })

  it('falls back to jade for invalid palette', () => {
    localStorage.setItem('Theme.Mode', 'light')
    localStorage.setItem('Theme.Palette', 'invalid')
    const { result } = renderHook(() => useTheme())
    expect(result.current.palette).toBe('jade')
  })
})
