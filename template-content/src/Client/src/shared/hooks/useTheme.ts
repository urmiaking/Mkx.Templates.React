import { flushSync } from 'react-dom'
import { useEffect, useState } from 'react'

export type Mode = 'light' | 'dark'
export const palettes = ['jade', 'ocean', 'iris', 'amber'] as const
export type Palette = (typeof palettes)[number]

const modeKey = 'Theme.Mode'
const paletteKey = 'Theme.Palette'
const mobilePickerKey = 'Theme.MobilePickerHidden'

function readPreference(key: string): string | null {
  try { return window.localStorage.getItem(key) } catch { return null }
}

function savePreference(key: string, value: string): void {
  try { window.localStorage.setItem(key, value) } catch { /* Private browsing can deny storage. */ }
}

function initialMode(): Mode {
  const stored = readPreference(modeKey) ?? readPreference('mkx-appearance')
  if (stored === 'light' || stored === 'dark') return stored
  return window.matchMedia?.('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
}

function initialPalette(): Palette {
  const stored = readPreference(paletteKey)
  return palettes.find(color => color === stored) ?? 'jade'
}

interface ViewTransitionHandle {
  ready: Promise<void>
  finished: Promise<void>
  skipTransition(): void
}

type AppearanceDocument = Document & {
  startViewTransition?: (update: () => void) => ViewTransitionHandle
}

let activeTransition: ViewTransitionHandle | null = null
let requestId = 0

/**
 * Mirror the Blazor radial appearance transition: the new snapshot expands
 * from the clicked control; when switching to light the old dark snapshot
 * contracts instead. Palette changes always expand the new snapshot.
 */
export async function revealAppearance(
  apply: () => void,
  source?: HTMLElement | null,
  kind: 'radial' | 'palette' = 'radial',
  reverse = false
): Promise<void> {
  const root = document.documentElement
  const nextRequest = ++requestId
  activeTransition?.skipTransition()
  activeTransition = null

  const documentWithTransition = document as AppearanceDocument
  if (!source || !documentWithTransition.startViewTransition ||
    window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) {
    delete root.dataset.themeTransition
    apply()
    return
  }

  const rect = source.getBoundingClientRect()
  const x = rect.left + rect.width / 2
  const y = rect.top + rect.height / 2
  const radius = Math.ceil(Math.hypot(
    Math.max(x, window.innerWidth - x),
    Math.max(y, window.innerHeight - y)
  ))
  root.dataset.themeTransition = kind

  let applied = false
  const commit = () => {
    if (applied || nextRequest !== requestId) return
    applied = true
    apply()
  }

  let transition: ViewTransitionHandle | null = null
  let animation: Animation | null = null
  try {
    transition = documentWithTransition.startViewTransition(commit)
    activeTransition = transition
    await transition.ready
    if (nextRequest !== requestId) return

    const clips = [
      `circle(0px at ${x}px ${y}px)`,
      `circle(${radius}px at ${x}px ${y}px)`
    ]
    animation = root.animate(
      { clipPath: reverse ? [...clips].reverse() : clips },
      {
        duration: 800,
        easing: reverse ? 'cubic-bezier(.64,0,.78,0)' : 'cubic-bezier(.22,1,.36,1)',
        pseudoElement: reverse ? '::view-transition-old(root)' : '::view-transition-new(root)',
        fill: 'both'
      }
    )
    await animation.finished
  } catch {
    // Unsupported pseudo-element animations still change the preference.
    if (nextRequest === requestId) {
      transition?.skipTransition()
      commit()
    }
  } finally {
    if (transition) await transition.finished.catch(() => undefined)
    animation?.cancel()
    if (nextRequest === requestId) {
      activeTransition = null
      delete root.dataset.themeTransition
      commit()
    }
  }
}

export function useTheme() {
  const [mode, setMode] = useState<Mode>(initialMode)
  const [palette, updatePalette] = useState<Palette>(initialPalette)
  const [mobilePickerHidden, updateMobilePickerHidden] = useState(
    () => readPreference(mobilePickerKey) === 'true'
  )

  useEffect(() => {
    document.documentElement.dataset.theme = mode
    savePreference(modeKey, mode)
  }, [mode])

  useEffect(() => {
    document.documentElement.dataset.palette = palette
    savePreference(paletteKey, palette)
  }, [palette])

  const setPalette = (next: Palette, source?: HTMLElement | null) => {
    if (next === palette) return
    void revealAppearance(() => {
      flushSync(() => {
        document.documentElement.dataset.palette = next
        updatePalette(next)
        savePreference(paletteKey, next)
      })
    }, source, 'palette')
  }

  const toggle = (source?: HTMLElement | null) => {
    const next = mode === 'dark' ? 'light' : 'dark'
    void revealAppearance(() => {
      flushSync(() => {
        document.documentElement.dataset.theme = next
        setMode(next)
        savePreference(modeKey, next)
      })
    }, source, 'radial', next === 'light')
  }

  const setMobilePickerHidden = (hidden: boolean) => {
    updateMobilePickerHidden(hidden)
    savePreference(mobilePickerKey, String(hidden))
  }

  return { mode, palette, setPalette, toggle, mobilePickerHidden, setMobilePickerHidden }
}
