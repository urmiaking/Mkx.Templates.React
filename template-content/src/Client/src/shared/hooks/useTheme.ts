import { useEffect, useState } from 'react'

export type Mode = 'light' | 'dark'
export const palettes = ['jade', 'ocean', 'iris', 'amber'] as const
export type Palette = typeof palettes[number]

const modeKey = 'Theme.Mode'
const paletteKey = 'Theme.Palette'

function readPreference(key: string): string | null {
  try { return localStorage.getItem(key) } catch { return null }
}

function initialMode(): Mode {
  const value = readPreference(modeKey) ?? readPreference('mkx-appearance')
  if (value === 'light' || value === 'dark') return value
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
}

function initialPalette(): Palette {
  const saved = readPreference(paletteKey)
  return palettes.find(p => p === saved) ?? 'jade'
}

export function useTheme() {
  const [mode, setMode] = useState<Mode>(initialMode)
  const [palette, setPalette] = useState<Palette>(initialPalette)

  useEffect(() => {
    document.documentElement.dataset.theme = mode
    document.documentElement.dataset.palette = palette
    try {
      localStorage.setItem(modeKey, mode)
      localStorage.setItem(paletteKey, palette)
    } catch { /* Browsers with disabled storage still allow appearance changes. */ }
  }, [mode, palette])

  return {
    mode, palette, setPalette,
    toggle: () => setMode(old => old === 'dark' ? 'light' : 'dark')
  }
}
