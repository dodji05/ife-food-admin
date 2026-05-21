import { create } from 'zustand'

export type Period = 'day' | 'week' | 'month'

interface FiltersStore {
  period: Period
  country: string
  /** Préférence globale "temps réel". Les pages peuvent l'utiliser pour
   *  conditionner leur refetchInterval (ex: refetchInterval: realtime ? 15000 : false). */
  realtime: boolean
  setPeriod: (p: Period) => void
  setCountry: (c: string) => void
  setRealtime: (v: boolean) => void
  /** Remet tous les filtres aux valeurs par défaut. */
  reset: () => void
}

const DEFAULTS: Pick<FiltersStore, 'period' | 'country' | 'realtime'> = {
  period: 'week',
  country: '',
  realtime: false,
}

export const useFiltersStore = create<FiltersStore>()((set) => ({
  ...DEFAULTS,
  setPeriod: (period) => set({ period }),
  setCountry: (country) => set({ country }),
  setRealtime: (realtime) => set({ realtime }),
  reset: () => set(DEFAULTS),
}))
