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
      <div className="flex rounded-xl overflow-hidden border border-edge">
        {PERIODS.map((p) => (
          <button
            key={p.value}
            onClick={() => setPeriod(p.value)}
            className={`px-3 py-1.5 text-xs font-bold transition-colors ${
              period === p.value
                ? 'bg-brand-green text-white'
                : 'bg-card text-ink2 hover:text-ink'
            }`}
          >
            {p.label}
          </button>
        ))}
      </div>

      <div className="relative flex items-center">
        <Globe size={13} className="absolute left-2.5 text-ink3 pointer-events-none"/>
        <select
          value={country}
          onChange={(e) => setCountry(e.target.value)}
          className="pl-7 pr-2 py-1.5 text-xs font-bold bg-card border border-edge rounded-xl text-ink2 appearance-none cursor-pointer hover:border-edge focus:outline-none focus:border-brand-green transition-colors"
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
            : 'bg-card border-edge text-ink3 hover:text-ink2 hover:border-edge'
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
          className="p-1.5 rounded-xl bg-card border border-edge text-ink3 hover:text-ink2 hover:border-edge transition-colors"
        >
          <RotateCcw size={13}/>
        </button>
      )}
    </div>
  )
}
