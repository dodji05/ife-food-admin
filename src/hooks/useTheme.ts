import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { useEffect } from 'react'

const DARK_START_HOUR = 19
const DARK_END_HOUR   = 6

type Override = 'auto' | 'light' | 'dark'

interface ThemeStore {
  override: Override
  isNight: boolean
  setOverride: (o: Override) => void
  tick: () => void
}

const isNightTime = (): boolean => {
  const h = new Date().getHours()
  return h >= DARK_START_HOUR || h < DARK_END_HOUR
}

function applyTheme(override: Override, isNight: boolean) {
  const isDark = override === 'dark' || (override === 'auto' && isNight)
  document.documentElement.classList.toggle('dark', isDark)
}

export const useThemeStore = create<ThemeStore>()(
  persist(
    (set, get) => ({
      override: 'auto',
      isNight: isNightTime(),

      setOverride: (override) => {
        set({ override, isNight: isNightTime() })
        applyTheme(override, isNightTime())
      },

      tick: () => {
        const { override, isNight } = get()
        const night = isNightTime()
        if (night !== isNight) {
          set({ isNight: night })
          if (override === 'auto') applyTheme('auto', night)
        }
      },
    }),
    {
      name: 'ife-theme',
      partialize: (s) => ({ override: s.override }),
      onRehydrateStorage: () => (state) => {
        if (state) applyTheme(state.override, isNightTime())
      },
    }
  )
)

export function useThemeInit() {
  const { override, tick } = useThemeStore()

  useEffect(() => {
    applyTheme(override, isNightTime())
    const id = setInterval(tick, 60_000)
    return () => clearInterval(id)
  }, [override, tick])
}

export function useTheme() {
  const { override, isNight, setOverride } = useThemeStore()
  const isDark = override === 'dark' || (override === 'auto' && isNight)
  const label =
    override === 'light' ? 'Clair (manuel)' :
    override === 'dark'  ? 'Sombre (manuel)' :
    isNight ? 'Automatique · sombre (nuit)' : 'Automatique · clair (jour)'
  return { override, isDark, isNight, label, setOverride }
}
