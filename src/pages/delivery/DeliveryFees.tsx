import React, { useState, useEffect, useMemo } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import api from '../../services/api'
import { Modal } from '../../components/ui/Modal'
import { formatCFA } from '../../utils/format'
import { useConfirm } from '../../hooks/useConfirm'
import {
  Plus, Pencil, Trash2, MapPin, Navigation, Building2,
  Cloud, CloudRain, Sun, Zap, Wind, RefreshCw,
} from 'lucide-react'
import toast from 'react-hot-toast'

// ─── Types ────────────────────────────────────────────────────────────────────
type DeliveryMode = 'zone' | 'km' | 'city'

interface Zone {
  id: string
  name: string
  country: string
  fromCity: string | null
  toCity: string | null
  baseFee: number
  perKmFee: number
  currency: string
  weatherMultiplier: number
  isActive: boolean
}

// ─── Météo Open-Meteo ─────────────────────────────────────────────────────────
const COUNTRY_COORDS: Record<string, { city: string; lat: number; lon: number }> = {
  BJ: { city: 'Cotonou',  lat: 6.3676,  lon: 2.4252  },
  SN: { city: 'Dakar',    lat: 14.7167, lon: -17.4677 },
  CI: { city: 'Abidjan',  lat: 5.3484,  lon: -4.0167  },
  TG: { city: 'Lomé',     lat: 6.1375,  lon: 1.2123   },
}

const WEATHER_STORAGE_KEY = 'ife_weather_config'

interface WeatherConfig {
  enabled: boolean
  country: string
  city: string
  lat: number
  lon: number
}

function loadWeatherConfig(): WeatherConfig {
  try {
    const stored = localStorage.getItem(WEATHER_STORAGE_KEY)
    if (stored) return JSON.parse(stored)
  } catch {}
  const def = COUNTRY_COORDS['BJ']
  return { enabled: false, country: 'BJ', city: def.city, lat: def.lat, lon: def.lon }
}

function saveWeatherConfig(cfg: WeatherConfig) {
  localStorage.setItem(WEATHER_STORAGE_KEY, JSON.stringify(cfg))
}

interface WeatherState {
  loading: boolean
  code: number | null
  description: string
  isBad: boolean
  windSpeed: number
  precipitation: number
  fetchedAt: string
}

// WMO codes: 0-3 = clair, 45-77 = brouillard/pluie/neige, 80-99 = averses/orage
function isBadWeather(code: number | null): boolean {
  if (code === null) return false
  return code >= 45
}

function weatherLabel(code: number | null): string {
  if (code === null) return 'Inconnu'
  if (code === 0)           return 'Ciel dégagé'
  if (code <= 3)            return 'Partiellement nuageux'
  if (code <= 19)           return 'Brume / Brouillard'
  if (code <= 29)           return 'Précipitations légères'
  if (code <= 39)           return 'Tempête de sable'
  if (code <= 49)           return 'Brouillard givrant'
  if (code <= 59)           return 'Bruine'
  if (code <= 69)           return 'Pluie'
  if (code <= 79)           return 'Neige'
  if (code <= 84)           return 'Averses de pluie'
  if (code <= 86)           return 'Averses de neige'
  if (code <= 94)           return 'Grêle'
  return 'Orage'
}

function WeatherIcon({ code, size = 18 }: { code: number | null; size?: number }) {
  if (code === null || code <= 3) return <Sun size={size} className="text-yellow-400"/>
  if (code <= 44)                 return <Cloud size={size} className="text-slate-400"/>
  if (code >= 95)                 return <Zap size={size} className="text-yellow-300"/>
  if (code >= 51)                 return <CloudRain size={size} className="text-blue-400"/>
  return <Wind size={size} className="text-slate-400"/>
}

async function fetchWeather(lat: number, lon: number): Promise<WeatherState> {
  const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=weather_code,precipitation,wind_speed_10m&timezone=auto`
  const res = await fetch(url)
  if (!res.ok) throw new Error('Open-Meteo unavailable')
  const json = await res.json()
  const code        = json.current?.weather_code ?? null
  const precipitation = json.current?.precipitation ?? 0
  const windSpeed   = json.current?.wind_speed_10m ?? 0
  return {
    loading: false,
    code,
    description: weatherLabel(code),
    isBad: isBadWeather(code),
    windSpeed,
    precipitation,
    fetchedAt: new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }),
  }
}

// ─── Helpers ──────────────────────────────────────────────────────────────────
function zoneMode(z: Zone): DeliveryMode {
  if (z.fromCity && z.toCity)    return 'city'
  if (z.perKmFee > 0)            return 'km'
  return 'zone'
}

const MODE_LABELS: Record<DeliveryMode, string> = {
  zone: 'Par zone',
  km:   'Par km',
  city: 'Par ville',
}
const MODE_ICONS: Record<DeliveryMode, React.ReactNode> = {
  zone: <Building2 size={16}/>,
  km:   <Navigation size={16}/>,
  city: <MapPin size={16}/>,
}

// ─── Formulaire zone ──────────────────────────────────────────────────────────
interface ZoneFormProps {
  mode: DeliveryMode
  initial?: Zone
  onSave: (dto: any) => void
  saving: boolean
}

const ZoneForm: React.FC<ZoneFormProps> = ({ mode, initial, onSave, saving }) => {
  const [form, setForm] = useState({
    name:              initial?.name              ?? '',
    country:           initial?.country           ?? 'BJ',
    fromCity:          initial?.fromCity          ?? '',
    toCity:            initial?.toCity            ?? '',
    baseFee:           String(initial?.baseFee    ?? ''),
    perKmFee:          String(initial?.perKmFee   ?? ''),
    currency:          initial?.currency          ?? 'XOF',
    weatherEnabled:    (initial?.weatherMultiplier ?? 1) > 1,
    weatherMultiplier: String(initial?.weatherMultiplier && initial.weatherMultiplier > 1 ? initial.weatherMultiplier : 1.5),
    isActive:          initial?.isActive          ?? true,
  })

  const set = (k: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
    setForm(f => ({ ...f, [k]: e.target.value }))

  const F = ({ label, children }: { label: string; children: React.ReactNode }) => (
    <div className="flex flex-col gap-1">
      <label className="label text-[10px]">{label}</label>
      {children}
    </div>
  )

  const submit = () => {
    if (!form.baseFee) { toast.error('Frais de base requis'); return }
    if (mode === 'city' && (!form.fromCity || !form.toCity)) { toast.error('Villes de départ et destination requises'); return }
    onSave({
      ...(initial?.id ? { id: initial.id } : {}),
      name:              mode === 'city' ? `${form.fromCity} → ${form.toCity}` : form.name,
      country:           form.country,
      fromCity:          mode === 'city' ? form.fromCity  : null,
      toCity:            mode === 'city' ? form.toCity    : null,
      baseFee:           Number(form.baseFee),
      perKmFee:          mode === 'km'   ? Number(form.perKmFee) : 0,
      currency:          form.currency,
      weatherMultiplier: form.weatherEnabled ? Number(form.weatherMultiplier) : 1,
      isActive:          form.isActive,
    })
  }

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-3">
        {mode !== 'city' && (
          <F label="Nom de la zone *">
            <input className="input" value={form.name} onChange={set('name')} placeholder="ex: Centre-ville"/>
          </F>
        )}
        <F label="Pays">
          <input className="input" value={form.country} onChange={set('country')} placeholder="BJ"/>
        </F>
        {mode === 'city' && (
          <>
            <F label="Ville départ *">
              <input className="input" value={form.fromCity} onChange={set('fromCity')} placeholder="Cotonou"/>
            </F>
            <F label="Ville destination *">
              <input className="input" value={form.toCity} onChange={set('toCity')} placeholder="Porto-Novo"/>
            </F>
          </>
        )}
        <F label="Frais de base (XOF) *">
          <input className="input" type="number" min="0" value={form.baseFee} onChange={set('baseFee')} placeholder="500"/>
        </F>
        {mode === 'km' && (
          <F label="Frais par km (XOF)">
            <input className="input" type="number" min="0" value={form.perKmFee} onChange={set('perKmFee')} placeholder="100"/>
          </F>
        )}
        <F label="Devise">
          <select className="input" value={form.currency} onChange={set('currency')}>
            <option value="XOF">XOF (FCFA)</option>
            <option value="EUR">EUR</option>
          </select>
        </F>
      </div>

      {/* Facteur météo */}
      <div className="border border-navy-600 rounded-xl p-3 space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CloudRain size={14} className="text-blue-400"/>
            <span className="text-sm font-bold text-slate-300">Facteur météo</span>
          </div>
          <label className="relative inline-flex items-center cursor-pointer">
            <input type="checkbox" checked={form.weatherEnabled}
              onChange={e => setForm(f => ({ ...f, weatherEnabled: e.target.checked }))} className="sr-only peer"/>
            <div className="w-9 h-5 bg-navy-700 rounded-full peer peer-checked:after:translate-x-4 peer-checked:bg-brand-green after:content-[''] after:absolute after:top-0.5 after:left-[2px] after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all"/>
          </label>
        </div>
        {form.weatherEnabled && (
          <F label="Multiplicateur (ex: 1.5 = +50%)">
            <input className="input" type="number" min="1" max="5" step="0.1"
              value={form.weatherMultiplier} onChange={set('weatherMultiplier')} placeholder="1.5"/>
          </F>
        )}
        {form.weatherEnabled && (
          <div className="text-xs text-slate-500">
            Frais effectifs si météo défavorable : <span className="font-bold text-slate-300">
              {form.baseFee ? formatCFA(Number(form.baseFee) * Number(form.weatherMultiplier)) : '—'}
            </span>
          </div>
        )}
      </div>

      {/* Statut */}
      <div className="flex items-center gap-3">
        <input type="checkbox" id="zone-active" checked={form.isActive}
          onChange={e => setForm(f => ({ ...f, isActive: e.target.checked }))}
          className="w-4 h-4 rounded accent-brand-green"/>
        <label htmlFor="zone-active" className="text-sm font-semibold text-slate-300 cursor-pointer">Zone active</label>
      </div>

      <button onClick={submit} disabled={saving} className="btn-primary w-full justify-center">
        {saving ? 'Enregistrement…' : initial ? 'Enregistrer' : 'Créer la zone'}
      </button>
    </div>
  )
}

// ─── Page principale ──────────────────────────────────────────────────────────
export const DeliveryFees: React.FC = () => {
  const qc = useQueryClient()
  const confirm = useConfirm()

  // Bloc 1 — filtre pays
  const [filterCountry, setFilterCountry] = useState('')

  // Bloc 2 — mode
  const [mode, setMode] = useState<DeliveryMode>('zone')

  // CRUD modal
  const [modal, setModal] = useState<{ zone?: Zone } | null>(null)

  // Bloc 4 — météo
  const [weatherCfg, setWeatherCfg] = useState<WeatherConfig>(loadWeatherConfig)
  const [weather, setWeather] = useState<WeatherState>({ loading: false, code: null, description: '', isBad: false, windSpeed: 0, precipitation: 0, fetchedAt: '' })
  const [weatherEditing, setWeatherEditing] = useState(false)
  const [latInput, setLatInput] = useState(String(weatherCfg.lat))
  const [lonInput, setLonInput] = useState(String(weatherCfg.lon))

  const loadWeather = async (cfg = weatherCfg) => {
    if (!cfg.enabled) return
    setWeather(w => ({ ...w, loading: true }))
    try {
      const w = await fetchWeather(cfg.lat, cfg.lon)
      setWeather(w)
    } catch {
      setWeather(w => ({ ...w, loading: false }))
      toast.error('Impossible de récupérer la météo')
    }
  }

  useEffect(() => { loadWeather() }, [weatherCfg.enabled])

  const saveWeatherCfg = (next: WeatherConfig) => {
    setWeatherCfg(next)
    saveWeatherConfig(next)
  }

  const applyWeatherCfgEdit = () => {
    const next = { ...weatherCfg, lat: Number(latInput), lon: Number(lonInput) }
    saveWeatherCfg(next)
    setWeatherEditing(false)
    loadWeather(next)
  }

  const pickCountryPreset = (code: string) => {
    const preset = COUNTRY_COORDS[code]
    if (preset) {
      setLatInput(String(preset.lat))
      setLonInput(String(preset.lon))
      saveWeatherCfg({ ...weatherCfg, country: code, city: preset.city, lat: preset.lat, lon: preset.lon })
    }
  }

  // Data
  const { data: rawZones = [], isLoading } = useQuery({
    queryKey: ['delivery-zones'],
    queryFn: () => api.get('/admin/delivery-zones').then((r: any) => {
      const d = r?.data?.data ?? r?.data ?? r
      return Array.isArray(d) ? d : []
    }),
  })

  const zones: Zone[] = rawZones

  const filtered = useMemo(() => zones.filter((z: Zone) => {
    const matchCountry = !filterCountry || z.country?.toLowerCase().includes(filterCountry.toLowerCase())
    const matchMode    = zoneMode(z) === mode
    return matchCountry && matchMode
  }), [zones, filterCountry, mode])

  const upsertMutation = useMutation({
    mutationFn: (dto: any) => api.post('/admin/delivery-zones', dto),
    onSuccess: () => {
      toast.success(modal?.zone ? 'Zone mise à jour' : 'Zone créée')
      qc.invalidateQueries({ queryKey: ['delivery-zones'] })
      setModal(null)
    },
    onError: (e: any) => toast.error(e?.response?.data?.message ?? e.message),
  })

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.delete(`/admin/delivery-zones/${id}`),
    onSuccess: () => {
      toast.success('Zone supprimée')
      qc.invalidateQueries({ queryKey: ['delivery-zones'] })
    },
    onError: (e: any) => toast.error(e?.response?.data?.message ?? e.message),
  })

  const effectiveFee = (z: Zone) => {
    if (weatherCfg.enabled && weather.isBad && z.weatherMultiplier > 1) {
      return z.baseFee * z.weatherMultiplier
    }
    return z.baseFee
  }

  return (
    <div className="space-y-5 max-w-3xl">

      {/* ── BLOC 1 : Filtre pays ─────────────────────────── */}
      <div className="card p-4">
        <div className="text-xs font-black text-slate-500 uppercase tracking-widest mb-3">Filtre</div>
        <div className="flex gap-3 items-end">
          <div className="flex flex-col gap-1 min-w-[160px]">
            <label className="label text-[10px]">Pays</label>
            <input className="input text-sm" value={filterCountry} onChange={e => setFilterCountry(e.target.value)} placeholder="BJ, SN…"/>
          </div>
          {filterCountry && (
            <button onClick={() => setFilterCountry('')} className="btn-secondary text-xs px-3 self-end">
              Effacer
            </button>
          )}
          <div className="ml-auto self-end text-xs text-slate-500 font-semibold">
            {filtered.length} zone{filtered.length !== 1 ? 's' : ''}
          </div>
        </div>
      </div>

      {/* ── BLOC 2 : Mode ────────────────────────────────── */}
      <div className="card p-4">
        <div className="text-xs font-black text-slate-500 uppercase tracking-widest mb-3">Mode de calcul</div>
        <div className="grid grid-cols-3 gap-2">
          {(['zone', 'km', 'city'] as DeliveryMode[]).map(m => (
            <button key={m} onClick={() => setMode(m)}
              className={`flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-bold transition-all border ${mode === m ? 'bg-brand-green/15 text-brand-green border-brand-green/40' : 'bg-navy-800 text-slate-400 border-navy-600 hover:text-slate-200 hover:bg-navy-700'}`}>
              {MODE_ICONS[m]}
              {MODE_LABELS[m]}
            </button>
          ))}
        </div>
        <div className="mt-3 text-xs text-slate-500">
          {mode === 'zone'  && 'Tarif fixe par zone géographique (quartier, arrondissement…)'}
          {mode === 'km'    && 'Tarif de base + montant par kilomètre parcouru'}
          {mode === 'city'  && 'Tarif fixe pour un trajet entre deux villes'}
        </div>
      </div>

      {/* ── BLOC 3 : CRUD zones ──────────────────────────── */}
      <div className="card p-4 space-y-4">
        <div className="flex items-center justify-between">
          <div className="text-xs font-black text-slate-500 uppercase tracking-widest">
            Zones · {MODE_LABELS[mode]}
          </div>
          <button onClick={() => setModal({})} className="btn-primary">
            <Plus size={15}/> Nouvelle zone
          </button>
        </div>

        {isLoading ? (
          <div className="space-y-2">{[0,1,2].map(i => <div key={i} className="h-16 bg-navy-800 rounded-xl animate-pulse"/>)}</div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-8 text-slate-500 text-sm">
            Aucune zone configurée pour ce mode
          </div>
        ) : (
          <div className="space-y-2">
            {filtered.map(z => {
              const effective = effectiveFee(z)
              const weatherActive = weatherCfg.enabled && weather.isBad && z.weatherMultiplier > 1
              return (
                <div key={z.id} className={`flex items-center gap-4 p-3 rounded-xl border transition-all ${z.isActive ? 'bg-navy-800 border-navy-600' : 'bg-navy-900 border-navy-700 opacity-60'}`}>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-slate-200 text-sm truncate">{z.name}</span>
                      <span className="text-[10px] font-bold text-slate-500 bg-navy-700 px-1.5 py-0.5 rounded">{z.country}</span>
                      {!z.isActive && <span className="text-[10px] font-bold text-red-400 bg-red-500/10 px-1.5 py-0.5 rounded">Inactif</span>}
                    </div>
                    <div className="flex items-center gap-3 mt-0.5">
                      <span className="text-xs text-slate-500">
                        Base : <span className="font-bold text-slate-300">{formatCFA(z.baseFee)}</span>
                        {mode === 'km' && z.perKmFee > 0 && ` + ${formatCFA(z.perKmFee)}/km`}
                      </span>
                      {weatherActive && (
                        <span className="flex items-center gap-1 text-xs font-bold text-blue-400">
                          <CloudRain size={11}/>
                          Effectif : {formatCFA(effective)}
                          <span className="text-slate-500 font-normal">(×{z.weatherMultiplier})</span>
                        </span>
                      )}
                      {z.weatherMultiplier > 1 && !weatherActive && (
                        <span className="text-xs text-slate-600">Météo ×{z.weatherMultiplier}</span>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-1">
                    <button onClick={() => setModal({ zone: z })}
                      className="p-1.5 text-blue-400 hover:bg-blue-500/10 rounded-lg transition-colors">
                      <Pencil size={14}/>
                    </button>
                    <button onClick={async () => {
                      const ok = await confirm({
                        title: 'Supprimer cette zone ?',
                        message: `« ${z.name} » sera définitivement supprimée.`,
                        variant: 'danger',
                        confirmLabel: 'Supprimer',
                      })
                      if (ok) deleteMutation.mutate(z.id)
                    }}
                      className="p-1.5 text-red-400 hover:bg-red-500/10 rounded-lg transition-colors">
                      <Trash2 size={14}/>
                    </button>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* ── BLOC 4 : Facteur météo global ────────────────── */}
      <div className="card p-4 space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-blue-500/10 border border-blue-500/20 flex items-center justify-center">
              <CloudRain size={15} className="text-blue-400"/>
            </div>
            <div>
              <div className="text-sm font-black text-slate-200">Facteur météo global</div>
              <div className="text-[11px] text-slate-500">via Open-Meteo · invisible au client</div>
            </div>
          </div>
          <label className="relative inline-flex items-center cursor-pointer">
            <input type="checkbox" checked={weatherCfg.enabled}
              onChange={e => { const next = { ...weatherCfg, enabled: e.target.checked }; saveWeatherCfg(next); if (e.target.checked) loadWeather(next) }}
              className="sr-only peer"/>
            <div className="w-11 h-6 bg-navy-700 rounded-full peer peer-checked:after:translate-x-5 peer-checked:bg-blue-500 after:content-[''] after:absolute after:top-0.5 after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all"/>
          </label>
        </div>

        {weatherCfg.enabled && (
          <>
            {/* Météo courante */}
            <div className={`flex items-center gap-4 p-3 rounded-xl border ${weather.isBad ? 'bg-blue-500/10 border-blue-500/30' : 'bg-navy-800 border-navy-600'}`}>
              <WeatherIcon code={weather.code} size={24}/>
              <div className="flex-1">
                {weather.loading ? (
                  <div className="text-sm text-slate-400">Chargement météo…</div>
                ) : weather.code !== null ? (
                  <>
                    <div className={`text-sm font-bold ${weather.isBad ? 'text-blue-300' : 'text-slate-200'}`}>
                      {weather.description}
                      {weather.isBad && <span className="ml-2 text-xs bg-blue-500/20 text-blue-400 px-2 py-0.5 rounded-full font-bold">Météo défavorable</span>}
                    </div>
                    <div className="text-xs text-slate-500 mt-0.5">
                      Précipitations : {weather.precipitation} mm · Vent : {weather.windSpeed} km/h · {weather.fetchedAt}
                    </div>
                  </>
                ) : (
                  <div className="text-sm text-slate-500">Données non disponibles</div>
                )}
              </div>
              <div className="text-xs text-slate-500 font-semibold">{weatherCfg.city}</div>
              <button onClick={() => loadWeather()} disabled={weather.loading}
                className="p-1.5 text-slate-400 hover:text-white hover:bg-navy-700 rounded-lg transition-colors">
                <RefreshCw size={14} className={weather.loading ? 'animate-spin' : ''}/>
              </button>
            </div>

            {/* Config localisation */}
            <div className="space-y-3">
              <div className="text-xs font-bold text-slate-500 uppercase tracking-widest">Localisation météo</div>

              {/* Presets pays */}
              <div className="flex flex-wrap gap-2">
                {Object.entries(COUNTRY_COORDS).map(([code, { city }]) => (
                  <button key={code} onClick={() => pickCountryPreset(code)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${weatherCfg.country === code ? 'bg-brand-green text-white' : 'bg-navy-800 text-slate-400 border border-navy-600 hover:text-slate-200'}`}>
                    {code} · {city}
                  </button>
                ))}
              </div>

              {/* Coordonnées manuelles */}
              {!weatherEditing ? (
                <div className="flex items-center gap-3">
                  <span className="text-xs text-slate-500 font-mono">{weatherCfg.lat}, {weatherCfg.lon}</span>
                  <button onClick={() => setWeatherEditing(true)} className="text-xs text-blue-400 hover:text-blue-300">
                    Coordonnées personnalisées
                  </button>
                </div>
              ) : (
                <div className="flex items-end gap-2">
                  <div className="flex flex-col gap-1">
                    <label className="label text-[10px]">Latitude</label>
                    <input className="input text-sm w-32" value={latInput} onChange={e => setLatInput(e.target.value)} placeholder="6.3676"/>
                  </div>
                  <div className="flex flex-col gap-1">
                    <label className="label text-[10px]">Longitude</label>
                    <input className="input text-sm w-32" value={lonInput} onChange={e => setLonInput(e.target.value)} placeholder="2.4252"/>
                  </div>
                  <button onClick={applyWeatherCfgEdit} className="btn-primary text-xs px-3 self-end">Appliquer</button>
                  <button onClick={() => setWeatherEditing(false)} className="btn-secondary text-xs px-3 self-end">Annuler</button>
                </div>
              )}
            </div>

            {weather.isBad && (
              <div className="p-3 bg-blue-500/10 border border-blue-500/30 rounded-xl text-xs text-blue-300 font-semibold">
                Météo défavorable détectée — les multiplicateurs météo des zones sont actifs. Les frais effectifs s'appliquent automatiquement.
              </div>
            )}
          </>
        )}
      </div>

      {/* ── Modal CRUD ────────────────────────────────────── */}
      <Modal
        open={!!modal}
        onClose={() => setModal(null)}
        title={modal?.zone ? 'Modifier la zone' : `Nouvelle zone — ${MODE_LABELS[mode]}`}
        size="md"
      >
        {modal && (
          <ZoneForm
            mode={modal.zone ? zoneMode(modal.zone) : mode}
            initial={modal.zone}
            onSave={dto => upsertMutation.mutate(dto)}
            saving={upsertMutation.isPending}
          />
        )}
      </Modal>
    </div>
  )
}
