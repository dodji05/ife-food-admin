import React from 'react'
import { Globe, RotateCcw, Activity } from 'lucide-react'
import { useFiltersStore, Period } from '../../store/filters'
import { COUNTRIES } from '../../constants/countries'

const PERIODS: { label: string; value: Period }[] = [
  { label: "Auj.", value: 'day' },
  { label: '7 j', value: 'week' },
  { label: '30 j', value: 'month' },
]

// Doit rester synchrone avec DEFAULTS dans store/filters.ts
const DEFAULT_PERIOD: Period = 'week'

export const GlobalFilters: React.FC = () => {
  const { period, country, realtime, setPeriod, setCountry, setRealtime, reset } = useFiltersStore()
  const isDirty = period !== DEFAULT_PERIOD || country !== '' || realtime

  return (
    <div className="flex items-center gap-2 flex-shrink-0 flex-wrap">
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
          <option value="">Tous pays</option>
          {COUNTRIES.map((c) => (
            <option key={c.code} value={c.code}>{c.name}</option>
          ))}
        </select>
      </div>

      {/* Toggle temps réel — les pages peuvent lire useFiltersStore().realtime
          pour conditionner leur refetchInterval. */}
      <button
        onClick={() => setRealtime(!realtime)}
        title={realtime ? 'Temps réel actif — cliquer pour désactiver' : 'Activer le temps réel'}
        aria-pressed={realtime}
        className={`relative p-1.5 rounded-xl border transition-colors ${
          realtime
            ? 'bg-brand-green/15 border-brand-green/40 text-brand-green'
            : 'bg-navy-800 border-navy-600 text-slate-500 hover:text-slate-300 hover:border-navy-500'
        }`}
      >
        <Activity size={13}/>
        {realtime && (
          <span className="absolute top-1 right-1 w-1.5 h-1.5 bg-brand-green rounded-full animate-pulse"/>
        )}
      </button>

      {/* Reset filtres — visible uniquement si l'un des filtres diffère du défaut */}
      {isDirty && (
        <button
          onClick={reset}
          title="Réinitialiser les filtres"
          className="p-1.5 rounded-xl bg-navy-800 border border-navy-600 text-slate-500 hover:text-slate-300 hover:border-navy-500 transition-colors"
        >
          <RotateCcw size={13}/>
        </button>
      )}
    </div>
  )
}
