import React from 'react'
import { Globe } from 'lucide-react'
import { useFiltersStore, Period } from '../../store/filters'

const PERIODS: { label: string; value: Period }[] = [
  { label: "Auj.", value: 'day' },
  { label: '7 j', value: 'week' },
  { label: '30 j', value: 'month' },
]

const COUNTRIES = [
  { label: 'Tous pays', value: '' },
  { label: 'Bénin', value: 'BJ' },
  { label: 'Sénégal', value: 'SN' },
  { label: "Côte d'Ivoire", value: 'CI' },
  { label: 'Togo', value: 'TG' },
]

export const GlobalFilters: React.FC = () => {
  const { period, country, setPeriod, setCountry } = useFiltersStore()

  return (
    <div className="flex items-center gap-2 flex-shrink-0">
      <div className="flex rounded-xl overflow-hidden border border-navy-600">
        {PERIODS.map((p) => (
          <button
            key={p.value}
            onClick={() => setPeriod(p.value)}
            className={`px-3 py-1.5 text-xs font-bold transition-colors ${
              period === p.value
                ? 'bg-brand-green text-white'
                : 'bg-navy-800 text-slate-400 hover:text-slate-200'
            }`}
          >
            {p.label}
          </button>
        ))}
      </div>

      <div className="relative flex items-center">
        <Globe size={13} className="absolute left-2.5 text-slate-500 pointer-events-none"/>
        <select
          value={country}
          onChange={(e) => setCountry(e.target.value)}
          className="pl-7 pr-2 py-1.5 text-xs font-bold bg-navy-800 border border-navy-600 rounded-xl text-slate-300 appearance-none cursor-pointer hover:border-navy-500 focus:outline-none focus:border-brand-green transition-colors"
        >
          {COUNTRIES.map((c) => (
            <option key={c.value} value={c.value}>{c.label}</option>
          ))}
        </select>
      </div>
    </div>
  )
}
