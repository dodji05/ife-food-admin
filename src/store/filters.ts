import { create } from 'zustand'

export type Period = 'day' | 'week' | 'month' | 'custom'

interface FiltersStore {
  period: Period
  country: string
  realtime: boolean
  dateFrom: string
  dateTo: string
  setPeriod: (p: Period) => void
  setCountry: (c: string) => void
  setRealtime: (v: boolean) => void
  setDateRange: (from: string, to: string) => void
  /** Remet tous les filtres aux valeurs par défaut. */
  reset: () => void
}

const DEFAULTS: Pick<FiltersStore, 'period' | 'country' | 'realtime' | 'dateFrom' | 'dateTo'> = {
  period: 'week',
  country: '',
  realtime: false,
  dateFrom: '',
  dateTo: '',
}

export const useFiltersStore = create<FiltersStore>()((set) => ({
  ...DEFAULTS,
  setPeriod: (period) => set({ period }),
  setCountry: (country) => set({ country }),
  setRealtime: (realtime) => set({ realtime }),
  setDateRange: (dateFrom, dateTo) => set({ dateFrom, dateTo }),
  reset: () => set(DEFAULTS),
}))
