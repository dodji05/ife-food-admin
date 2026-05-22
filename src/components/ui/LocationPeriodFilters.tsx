import React, { useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Globe, MapPin, RotateCcw, RefreshCw, Calendar } from 'lucide-react'
import api from '../../services/api'
import { useFiltersStore, Period } from '../../store/filters'

const COUNTRIES = [
  { code: '',   name: 'Tous pays' },
  { code: 'BJ', name: 'Bénin' },
  { code: 'SN', name: 'Sénégal' },
  { code: 'CI', name: "Côte d'Ivoire" },
  { code: 'TG', name: 'Togo' },
]

// Départements du Bénin (région = département administratif local).
// Filtre dynamiquement les villes proposées dans le dropdown.
export const BJ_REGIONS: Record<string, { name: string; cities: string[] }> = {
  AT: { name: 'Atlantique',  cities: ['Allada', 'Abomey-Calavi', 'Kpomassè', 'Ouidah', 'Sô-Ava', 'Toffo', 'Tori-Bossito', 'Zè'] },
  LI: { name: 'Littoral',    cities: ['Cotonou'] },
  OU: { name: 'Ouémé',       cities: ['Porto-Novo', 'Adjarra', 'Adjohoun', 'Aguégués', 'Akpro-Missérété', 'Avrankou', 'Bonou', 'Dangbo', 'Sèmè-Kpodji'] },
  PL: { name: 'Plateau',     cities: ['Pobè', 'Adja-Ouèrè', 'Ifangni', 'Kétou', 'Sakété'] },
  ZO: { name: 'Zou',         cities: ['Abomey', 'Agbangnizoun', 'Bohicon', 'Covè', 'Djidja', 'Ouinhi', 'Zagnanado', 'Za-Kpota', 'Zogbodomey'] },
  MO: { name: 'Mono',        cities: ['Lokossa', 'Athiémé', 'Bopa', 'Comè', 'Grand-Popo', 'Houéyogbé'] },
  CO: { name: 'Couffo',      cities: ['Aplahoué', 'Djakotomey', 'Dogbo', 'Klouékanmè', 'Lalo', 'Toviklin'] },
  BO: { name: 'Borgou',      cities: ['Parakou', 'Bembéréké', 'Kalalé', "N'Dali", 'Nikki', 'Pèrèrè', 'Sinendé', 'Tchaourou'] },
  AL: { name: 'Alibori',     cities: ['Kandi', 'Banikoara', 'Gogounou', 'Karimama', 'Malanville', 'Ségbana'] },
  AK: { name: 'Atacora',     cities: ['Natitingou', 'Boukoumbé', 'Cobly', 'Kérou', 'Kouandé', 'Matéri', 'Péhonko', 'Tanguiéta', 'Toucountouna'] },
  DO: { name: 'Donga',       cities: ['Djougou', 'Bassila', 'Copargo', 'Ouaké'] },
  CL: { name: 'Collines',    cities: ['Dassa-Zoumè', 'Bantè', 'Glazoué', 'Ouèssè', 'Savalou', 'Savè'] },
}

const PERIODS: { label: string; value: Period }[] = [
  { label: "Auj.", value: 'day' },
  { label: '7 jours', value: 'week' },
  { label: '30 jours', value: 'month' },
  { label: 'Personnalisé', value: 'custom' },
]

export interface LocationPeriodFiltersProps {
  /** État local de la région (BJ uniquement). */
  region: string
  /** Setter associé. */
  onRegionChange: (v: string) => void
  /** État local de la ville. */
  city: string
  /** Setter associé. */
  onCityChange: (v: string) => void
  /** Source des villes — si non fournie, la liste est récupérée via /admin/filters/cities. */
  cities?: string[]
  /** Affiche un bouton "Actualiser" optionnel (visible si onRefresh est fourni). */
  onRefresh?: () => void
  /** Désactive le bouton "Actualiser" et fait tourner l'icône. */
  isRefreshing?: boolean
}

export const LocationPeriodFilters: React.FC<LocationPeriodFiltersProps> = ({
  region, onRegionChange,
  city, onCityChange,
  cities, onRefresh, isRefreshing,
}) => {
  const { period, country, dateFrom, dateTo, setPeriod, setCountry, setDateRange, reset: resetGlobal } = useFiltersStore()

  // Si la page n'a pas fourni la liste des villes, on la récupère ici (cached).
  const { data: fetchedCities } = useQuery({
    queryKey: ['filter-cities', country],
    queryFn: () => api.get(`/admin/filters/cities${country ? `?country=${country}` : ''}`)
      .then((r: any) => r?.data ?? []),
    enabled: cities === undefined,
    staleTime: 60_000,
  })

  const allCities: string[] = cities ?? fetchedCities ?? []

  // Si une région BJ est sélectionnée → filtre les villes proposées
  const availableCities = useMemo(() => {
    if (region && country === 'BJ' && BJ_REGIONS[region]) {
      const allowed = new Set(BJ_REGIONS[region].cities)
      return allCities.filter(c => allowed.has(c))
    }
    return allCities
  }, [allCities, region, country])

  const filtersDirty = period !== 'week' || country !== '' || region !== '' || city !== ''

  const resetFilters = () => {
    resetGlobal()
    onRegionChange('')
    onCityChange('')
  }

  const handlePeriodChange = (p: Period) => {
    setPeriod(p)
    if (p !== 'custom') setDateRange('', '')
  }

  return (
    <div className="card p-4 flex items-end gap-3 flex-wrap">
      <Field label="Pays" icon={Globe}>
        <select value={country}
          onChange={e => { setCountry(e.target.value); onRegionChange(''); onCityChange('') }}
          className="input h-9 text-sm pr-8 appearance-none cursor-pointer">
          {COUNTRIES.map(c => <option key={c.code} value={c.code}>{c.name}</option>)}
        </select>
      </Field>

      <Field label="Région / Département" icon={MapPin}>
        <select value={region}
          onChange={e => { onRegionChange(e.target.value); onCityChange('') }}
          disabled={country !== 'BJ'}
          title={country !== 'BJ' ? 'Disponible uniquement pour le Bénin' : ''}
          className="input h-9 text-sm pr-8 appearance-none cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed">
          <option value="">{country === 'BJ' ? 'Toutes régions' : '—'}</option>
          {country === 'BJ' && Object.entries(BJ_REGIONS).map(([code, r]) =>
            <option key={code} value={code}>{r.name}</option>
          )}
        </select>
      </Field>

      <Field label="Ville" icon={MapPin}>
        <select value={city}
          onChange={e => onCityChange(e.target.value)}
          className="input h-9 text-sm pr-8 appearance-none cursor-pointer">
          <option value="">Toutes villes</option>
          {availableCities.map(c => <option key={c} value={c}>{c}</option>)}
        </select>
      </Field>

      <Field label="Période">
        <div className="flex rounded-xl overflow-hidden border border-navy-600 h-9">
          {PERIODS.map(p => (
            <button key={p.value} onClick={() => handlePeriodChange(p.value)}
              className={`px-3 text-xs font-bold transition-colors ${period === p.value ? 'bg-brand-green text-white' : 'bg-navy-800 text-slate-400 hover:text-slate-200'}`}>
              {p.label}
            </button>
          ))}
        </div>
      </Field>

      {period === 'custom' && (
        <>
          <Field label="Du" icon={Calendar}>
            <input
              type="date"
              value={dateFrom}
              max={dateTo || undefined}
              onChange={e => setDateRange(e.target.value, dateTo)}
              className="input h-9 text-sm px-3 cursor-pointer"
            />
          </Field>
          <Field label="Au" icon={Calendar}>
            <input
              type="date"
              value={dateTo}
              min={dateFrom || undefined}
              onChange={e => setDateRange(dateFrom, e.target.value)}
              className="input h-9 text-sm px-3 cursor-pointer"
            />
          </Field>
        </>
      )}

      <div className="flex-1"/>

      {filtersDirty && (
        <button onClick={resetFilters}
          className="btn-secondary h-9 text-xs px-3"
          title="Réinitialiser tous les filtres">
          <RotateCcw size={13}/> Réinitialiser
        </button>
      )}
      {onRefresh && (
        <button onClick={onRefresh}
          disabled={isRefreshing}
          className="btn-primary h-9 text-xs px-3 disabled:opacity-50"
          title="Recharger">
          <RefreshCw size={13} className={isRefreshing ? 'animate-spin' : ''}/>
          Actualiser
        </button>
      )}
    </div>
  )
}

const Field: React.FC<{ label: string; icon?: any; children: React.ReactNode }> = ({ label, icon: Icon, children }) => (
  <div className="flex flex-col gap-1 min-w-[140px]">
    <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1">
      {Icon && <Icon size={11}/>} {label}
    </span>
    {children}
  </div>
)
