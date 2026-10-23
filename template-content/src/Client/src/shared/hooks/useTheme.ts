import { useEffect, useState } from 'react'

type Mode = 'light' | 'dark'
const key = 'mkx-appearance'

function initialMode(): Mode {
  const saved = localStorage.getItem(key)
  if (saved === 'light' || saved === 'dark') return saved
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
}

export function useTheme() {
  const [mode, setMode] = useState<Mode>(initialMode)
  useEffect(() => {
    document.documentElement.dataset.theme = mode
    localStorage.setItem(key, mode)
  }, [mode])
  return { mode, toggle: () => setMode(old => old === 'dark' ? 'light' : 'dark') }
}
