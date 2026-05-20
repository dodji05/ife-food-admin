import { create } from 'zustand'

export type Period = 'day' | 'week' | 'month'

interface FiltersStore {
  period: Period
  country: string
  setPeriod: (p: Period) => void
  setCountry: (c: string) => void
}

export const useFiltersStore = create<FiltersStore>()((set) => ({
  period: 'week',
  country: '',
  setPeriod: (period) => set({ period }),
  setCountry: (country) => set({ country }),
}))
