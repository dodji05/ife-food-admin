import React, { useState, useEffect, useMemo, useRef } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import api from '../../services/api'
import { Modal } from '../../components/ui/Modal'
import { formatCFA } from '../../utils/format'
import { useConfirm } from '../../hooks/useConfirm'
import { COUNTRIES } from '../../constants/countries'
import {
  Plus, Pencil, Trash2, MapPin, Navigation, Building2,
  Cloud, CloudRain, Sun, Zap, Wind, RefreshCw, Save,
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
const MODES_STORAGE_KEY   = 'ife_delivery_modes'

interface WeatherConfig {
  enabled: boolean
  country: string
  city: string
  lat: number
  lon: number
  globalMultiplier: number
}

interface ModesConfig {
  zone: boolean
  km: boolean
  city: boolean
}

function loadWeatherConfig(): WeatherConfig {
  try {
    const stored = localStorage.getItem(WEATHER_STORAGE_KEY)
    if (stored) {
      const parsed = JSON.parse(stored)
      return { globalMultiplier: 1.5, ...parsed }
    }
  } catch {}
  const def = COUNTRY_COORDS['BJ']
  return { enabled: false, country: 'BJ', city: def.city, lat: def.lat, lon: def.lon, globalMultiplier: 1.5 }
}

function saveWeatherConfig(cfg: WeatherConfig) {
  localStorage.setItem(WEATHER_STORAGE_KEY, JSON.stringify(cfg))
}

function loadModesConfig(): ModesConfig {
  try {
    const stored = localStorage.getItem(MODES_STORAGE_KEY)
    if (stored) {
      const parsed = JSON.parse(stored)
      for (const m of ['zone', 'km', 'city'] as DeliveryMode[]) {
        if (parsed[m]) return { zone: m === 'zone', km: m === 'km', city: m === 'city' }
      }
    }
  } catch {}
  return { zone: true, km: false, city: false }
}

function saveModesConfig(cfg: ModesConfig) {
  localStorage.setItem(MODES_STORAGE_KEY, JSON.stringify(cfg))
}

function activeModeFromConfig(cfg: ModesConfig): DeliveryMode {
  if (cfg.km) return 'km'
  if (cfg.city) return 'city'
  return 'zone'
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

function isBadWeather(code: number | null): boolean {
  if (code === null) return false
  return code >= 45
}

function weatherLabel(code: number | null): string {
  if (code === null) return 'Inconnu'
  if (code === 0)    return 'Ciel dégagé'
  if (code <= 3)     return 'Partiellement nuageux'
  if (code <= 19)    return 'Brume / Brouillard'
  if (code <= 29)    return 'Précipitations légères'
  if (code <= 39)    return 'Tempête de sable'
  if (code <= 49)    return 'Brouillard givrant'
  if (code <= 59)    return 'Bruine'
  if (code <= 69)    return 'Pluie'
  if (code <= 79)    return 'Neige'
  if (code <= 84)    return 'Averses de pluie'
  if (code <= 86)    return 'Averses de neige'
  if (code <= 94)    return 'Grêle'
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
  const code          = json.current?.weather_code ?? null
  const precipitation = json.current?.precipitation ?? 0
  const windSpeed     = json.current?.wind_speed_10m ?? 0
  return {
    loading: false, code,
    description: weatherLabel(code),
    isBad: isBadWeather(code),
    windSpeed, precipitation,
    fetchedAt: new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }),
  }
}

// ─── Helpers ──────────────────────────────────────────────────────────────────
function zoneMode(z: Zone): DeliveryMode {
  if (z.fromCity && z.toCity) return 'city'
  if (z.perKmFee > 0)         return 'km'
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
const MODE_DESC: Record<DeliveryMode, string> = {
  zone: 'Tarif fixe par zone géographique (quartier, arrondissement…)',
  km:   'Tarif de base + montant par kilomètre parcouru',
  city: 'Tarif fixe pour un trajet entre deux villes',
}

// ─── Toggle switch ─────────────────────────────────────────────────────────────
const Toggle: React.FC<{
  checked: boolean
  onChange: (v: boolean) => void
  size?: 'sm' | 'md'
}> = ({ checked, onChange, size = 'md' }) => {
  const sm = size === 'sm'
  return (
    <label className="relative inline-flex items-center cursor-pointer flex-shrink-0" onClick={e => e.stopPropagation()}>
      <input type="checkbox" checked={checked} onChange={e => onChange(e.target.checked)} className="sr-only peer"/>
      <div className={`${sm ? 'w-9 h-5' : 'w-11 h-6'} bg-navy-700 rounded-full peer
        peer-checked:after:${sm ? 'translate-x-4' : 'translate-x-5'}
        peer-checked:bg-brand-green
        after:content-[''] after:absolute after:top-0.5 after:left-[2px]
        after:bg-white after:rounded-full
        after:${sm ? 'h-4 after:w-4' : 'h-5 after:w-5'}
        after:transition-all`}/>
    </label>
  )
}

// ─── Champ générique ─────────────────────────────────────────────────────────
const F = ({ label, children }: { label: string; children: React.ReactNode }) => (
  <div className="flex flex-col gap-1">
    <label className="label text-[10px]">{label}</label>
    {children}
  </div>
)

// ─── Formulaire zone ──────────────────────────────────────────────────────────
interface ZoneFormProps {
  mode: DeliveryMode
  initial?: Zone
  onSave: (dto: any) => void
  saving: boolean
  globalWeatherEnabled?: boolean
  globalMultiplier?: number
}

const ZoneForm: React.FC<ZoneFormProps> = ({ mode, initial, onSave, saving, globalWeatherEnabled, globalMultiplier }) => {
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

  const effectiveMultiplier = globalWeatherEnabled && globalMultiplier && globalMultiplier > 1
    ? globalMultiplier
    : (form.weatherEnabled ? Number(form.weatherMultiplier) : 1)

  const submit = () => {
    if (mode !== 'city' && !form.name.trim()) { toast.error('Nom de zone requis'); return }
    if (!form.baseFee || Number(form.baseFee) < 0) { toast.error('Frais de base requis'); return }
    if (mode === 'km' && (!form.perKmFee || Number(form.perKmFee) <= 0)) { toast.error('Frais par km requis et doit être supérieur à 0'); return }
    if (mode === 'city' && (!form.fromCity || !form.toCity)) { toast.error('Villes de départ et destination requises'); return }
    onSave({
      ...(initial?.id ? { id: initial.id } : {}),
      name:              mode === 'city' ? `${form.fromCity} → ${form.toCity}` : form.name,
      country:           form.country,
      fromCity:          mode === 'city' ? form.fromCity  : null,
      toCity:            mode === 'city' ? form.toCity    : (mode === 'km' || mode === 'zone') ? (form.toCity.trim() || null) : null,
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
          <select className="input appearance-none cursor-pointer" value={form.country} onChange={set('country')}>
            {COUNTRIES.map(c => <option key={c.code} value={c.code}>{c.name}</option>)}
          </select>
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
          <input
            className="input"
            inputMode="decimal"
            value={form.baseFee}
            onChange={set('baseFee')}
            placeholder="500"
          />
        </F>
        {mode === 'km' && (
          <>
            <F label="Frais par km (XOF) *">
              <input
                className="input"
                inputMode="decimal"
                value={form.perKmFee}
                onChange={set('perKmFee')}
                placeholder="100"
              />
            </F>
            <F label="Ville de livraison (optionnel)">
              <input
                className="input"
                value={form.toCity}
                onChange={set('toCity')}
                placeholder="ex: Cotonou — laisser vide pour taux universel"
              />
            </F>
          </>
        )}
        {mode === 'zone' && (
          <F label="Ville desservie (optionnel)">
            <input
              className="input"
              value={form.toCity}
              onChange={set('toCity')}
              placeholder="ex: Cotonou — laisser vide pour zone générique"
            />
          </F>
        )}
        <F label="Devise">
          <select className="input" value={form.currency} onChange={set('currency')}>
            <option value="XOF">XOF (FCFA)</option>
            <option value="EUR">EUR</option>
          </select>
        </F>
      </div>

      {/* Facteur météo individuel */}
      {globalWeatherEnabled && globalMultiplier && globalMultiplier > 1 ? (
        <div className="flex items-center gap-2 px-3 py-2.5 bg-blue-500/10 border border-blue-500/20 rounded-xl text-xs text-blue-300 font-semibold">
          <CloudRain size={13}/>
          Multiplicateur météo global actif : ×{globalMultiplier} — la valeur individuelle est ignorée.
        </div>
      ) : (
        <div className="border border-navy-600 rounded-xl p-3 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <CloudRain size={14} className="text-blue-400"/>
              <span className="text-sm font-bold text-slate-300">Facteur météo (cette zone)</span>
            </div>
            <Toggle
              checked={form.weatherEnabled}
              onChange={v => setForm(f => ({ ...f, weatherEnabled: v }))}
              size="sm"
            />
          </div>
          {form.weatherEnabled && (
            <>
              <F label="Multiplicateur (ex: 1.5 = +50%)">
                <input
                  className="input"
                  inputMode="decimal"
                  value={form.weatherMultiplier}
                  onChange={set('weatherMultiplier')}
                  placeholder="1.5"
                />
              </F>
              <div className="text-xs text-slate-500">
                Frais effectifs si météo défavorable :{' '}
                <span className="font-bold text-slate-300">
                  {form.baseFee ? formatCFA(Number(form.baseFee) * Number(form.weatherMultiplier)) : '—'}
                </span>
              </div>
            </>
          )}
        </div>
      )}

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

  const [filterCountry, setFilterCountry] = useState('')
  const [modesConfig, setModesConfig] = useState<ModesConfig>(() => loadModesConfig())
  const [mode, setMode] = useState<DeliveryMode>(() => activeModeFromConfig(loadModesConfig()))
  const [modal, setModal] = useState<{ zone?: Zone } | null>(null)
  const zonesRef = useRef<HTMLDivElement>(null)
  const prevModeRef = useRef<{ config: ModesConfig; mode: DeliveryMode } | null>(null)

  // Charge le mode actif depuis le backend au montage — écrase le cache localStorage
  useQuery({
    queryKey: ['delivery-mode-config'],
    queryFn: () => api.get('/admin/config/delivery-mode').then((r: any) => {
      const m = (r?.data?.activeMode ?? r?.activeMode ?? 'zone') as DeliveryMode
      const next: ModesConfig = { zone: m === 'zone', km: m === 'km', city: m === 'city' }
      setModesConfig(next)
      setMode(m)
      saveModesConfig(next)
      return m
    }),
    staleTime: Infinity,
  })

  const modeConfigMutation = useMutation({
    mutationFn: (m: DeliveryMode) =>
      api.put('/admin/config/delivery-mode', { activeMode: m }),
    onError: () => {
      const snapshot = prevModeRef.current
      if (snapshot) {
        setModesConfig(snapshot.config)
        setMode(snapshot.mode)
        saveModesConfig(snapshot.config)
      }
      toast.error('Erreur lors de la sauvegarde du mode de calcul')
    },
  })

  const activateMode = (m: DeliveryMode) => {
    if (m === mode) return
    prevModeRef.current = { config: modesConfig, mode }
    const next: ModesConfig = { zone: m === 'zone', km: m === 'km', city: m === 'city' }
    setModesConfig(next)
    setMode(m)
    saveModesConfig(next)
    modeConfigMutation.mutate(m)
    requestAnimationFrame(() => {
      zonesRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' })
    })
  }

  // Météo
  const [weatherCfg, setWeatherCfg]     = useState<WeatherConfig>(loadWeatherConfig)
  const [weather, setWeather]           = useState<WeatherState>({ loading: false, code: null, description: '', isBad: false, windSpeed: 0, precipitation: 0, fetchedAt: '' })
  const [weatherEditing, setWeatherEditing] = useState(false)
  const [latInput, setLatInput]         = useState(String(weatherCfg.lat))
  const [lonInput, setLonInput]         = useState(String(weatherCfg.lon))
  const [globalMultiplierInput, setGlobalMultiplierInput] = useState(String(weatherCfg.globalMultiplier ?? 1.5))
  const [applyingGlobal, setApplyingGlobal] = useState(false)

  const { data: rawZones = [], isLoading } = useQuery({
    queryKey: ['delivery-zones'],
    queryFn: () => api.get('/admin/delivery-zones').then((r: any) => {
      const d = r?.data?.data ?? r?.data ?? r
      return Array.isArray(d) ? d : []
    }),
  })
  const zones: Zone[] = rawZones

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

  const saveGlobalMultiplier = () => {
    const val = Number(globalMultiplierInput)
    if (isNaN(val) || val < 1) { toast.error('Valeur invalide (minimum 1)'); return }
    saveWeatherCfg({ ...weatherCfg, globalMultiplier: val })
    toast.success('Multiplicateur global enregistré')
  }

  const applyGlobalToAllZones = async () => {
    const val = Number(globalMultiplierInput)
    if (isNaN(val) || val < 1) { toast.error('Valeur invalide (minimum 1)'); return }
    if (zones.length === 0) { toast.error('Aucune zone à mettre à jour'); return }
    const ok = await confirm({
      title: 'Appliquer à toutes les zones ?',
      message: `Le multiplicateur météo ×${val} sera appliqué aux ${zones.length} zone${zones.length > 1 ? 's' : ''}. Les valeurs individuelles seront écrasées.`,
      variant: 'info',
      confirmLabel: 'Appliquer',
    })
    if (!ok) return
    setApplyingGlobal(true)
    try {
      await Promise.all(
        zones.map(z => api.post('/admin/delivery-zones', { id: z.id, weatherMultiplier: val }))
      )
      saveWeatherCfg({ ...weatherCfg, globalMultiplier: val })
      qc.invalidateQueries({ queryKey: ['delivery-zones'] })
      toast.success(`Multiplicateur ×${val} appliqué à toutes les zones`)
    } catch (e: any) {
      toast.error(e?.response?.data?.message ?? 'Erreur lors de l\'application')
    } finally {
      setApplyingGlobal(false)
    }
  }

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

  const filtered = useMemo(() => zones.filter((z: Zone) => {
    const matchCountry = !filterCountry || z.country === filterCountry
    const matchMode    = zoneMode(z) === mode
    return matchCountry && matchMode
  }), [zones, filterCountry, mode])

  const effectiveFee = (z: Zone) => {
    if (!weatherCfg.enabled || !weather.isBad) return z.baseFee
    const multiplier = weatherCfg.globalMultiplier > 1
      ? weatherCfg.globalMultiplier
      : (z.weatherMultiplier > 1 ? z.weatherMultiplier : 1)
    return z.baseFee * multiplier
  }

  return (
    <div className="space-y-5 max-w-3xl">

      {/* ── BLOC 1 : Filtre pays ─────────────────────────── */}
      <div className="card p-4">
        <div className="text-xs font-black text-slate-500 uppercase tracking-widest mb-3">Filtre</div>
        <div className="flex gap-3 items-end">
          <div className="flex flex-col gap-1 min-w-[160px]">
            <label className="label text-[10px]">Pays</label>
            <select className="input text-sm appearance-none cursor-pointer" value={filterCountry} onChange={e => setFilterCountry(e.target.value)}>
              <option value="">Tous les pays</option>
              {COUNTRIES.map(c => <option key={c.code} value={c.code}>{c.name}</option>)}
            </select>
          </div>
          {filterCountry && (
            <button onClick={() => setFilterCountry('')} className="btn-secondary text-xs px-3 self-end">Effacer</button>
          )}
          <div className="ml-auto self-end text-xs text-slate-500 font-semibold">
            {filtered.length} zone{filtered.length !== 1 ? 's' : ''}
          </div>
        </div>
      </div>

      {/* ── BLOC 2 : Modes de calcul ─────────────────────── */}
      <div className="card p-4 space-y-3">
        <div className="text-xs font-black text-slate-500 uppercase tracking-widest">Mode de calcul actif</div>

        <div className="grid grid-cols-3 gap-2">
          {(['zone', 'km', 'city'] as DeliveryMode[]).map(m => {
            const isActive = modesConfig[m]
            return (
              <div
                key={m}
                onClick={() => activateMode(m)}
                className={`flex flex-col gap-2 p-3 rounded-xl border cursor-pointer transition-all ${
                  isActive
                    ? 'bg-brand-green/15 border-brand-green/40'
                    : 'bg-navy-800 border-navy-600 hover:bg-navy-700'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className={`flex items-center gap-2 text-sm font-bold ${isActive ? 'text-brand-green' : 'text-slate-400'}`}>
                    {MODE_ICONS[m]}
                    {MODE_LABELS[m]}
                  </div>
                  <Toggle checked={isActive} onChange={() => activateMode(m)} size="sm"/>
                </div>
                <div className="text-[10px] text-slate-500 leading-tight">{MODE_DESC[m]}</div>
                {isActive && (
                  <div className="text-[10px] font-bold text-brand-green bg-brand-green/10 px-1.5 py-0.5 rounded w-fit">Actif</div>
                )}
              </div>
            )
          })}
        </div>
      </div>

      {/* ── BLOC 3 : CRUD zones ──────────────────────────── */}
      <div ref={zonesRef} className="card p-4 space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1.5 text-brand-green">
              {MODE_ICONS[mode]}
              <span className="text-sm font-black">{MODE_LABELS[mode]}</span>
            </div>
            <span className="text-xs text-slate-500 font-semibold">
              — {filtered.length} tarif{filtered.length !== 1 ? 's' : ''} configuré{filtered.length !== 1 ? 's' : ''}
            </span>
          </div>
          <button
            onClick={() => setModal({})}
            className="btn-primary"
          >
            <Plus size={15}/> Nouvelle zone
          </button>
        </div>

        {isLoading ? (
          <div className="space-y-2">{[0,1,2].map(i => <div key={i} className="h-16 bg-navy-800 rounded-xl animate-pulse"/>)}</div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-8 text-slate-500 text-sm">Aucun tarif configuré pour ce mode</div>
        ) : (
          <div key={mode} className="space-y-2">
            {filtered.map(z => {
              const effective     = effectiveFee(z)
              const multiplierUsed = weatherCfg.enabled && weather.isBad
                ? (weatherCfg.globalMultiplier > 1 ? weatherCfg.globalMultiplier : (z.weatherMultiplier > 1 ? z.weatherMultiplier : 1))
                : 1
              const weatherActive = weatherCfg.enabled && weather.isBad && multiplierUsed > 1
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
                          <span className="text-slate-500 font-normal">(×{multiplierUsed})</span>
                        </span>
                      )}
                      {!weatherActive && z.weatherMultiplier > 1 && (
                        <span className="text-xs text-slate-600">Météo ×{z.weatherMultiplier}</span>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-1">
                    <button onClick={() => setModal({ zone: z })} className="p-1.5 text-blue-400 hover:bg-blue-500/10 rounded-lg transition-colors">
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
                    }} className="p-1.5 text-red-400 hover:bg-red-500/10 rounded-lg transition-colors">
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
          <Toggle
            checked={weatherCfg.enabled}
            onChange={enabled => {
              const next = { ...weatherCfg, enabled }
              saveWeatherCfg(next)
              if (enabled) loadWeather(next)
            }}
          />
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

            {/* Multiplicateur global */}
            <div className="border border-navy-600 rounded-xl p-3 space-y-3">
              <div className="text-xs font-black text-slate-400 uppercase tracking-widest">Multiplicateur global</div>
              <div className="flex items-end gap-3">
                <div className="flex-1">
                  <label className="label text-[10px]">Valeur (ex: 1.5 = +50%)</label>
                  <input
                    className="input w-full"
                    inputMode="decimal"
                    value={globalMultiplierInput}
                    onChange={e => setGlobalMultiplierInput(e.target.value)}
                    placeholder="1.5"
                  />
                </div>
                <button onClick={saveGlobalMultiplier} className="btn-secondary text-xs px-3 self-end flex items-center gap-1.5">
                  <Save size={12}/> Enregistrer
                </button>
              </div>

              {weatherCfg.globalMultiplier > 1 && (
                <div className="text-xs text-slate-500">
                  Multiplicateur actif : <span className="font-bold text-blue-300">×{weatherCfg.globalMultiplier}</span>
                  {' '}— prioritaire sur les valeurs individuelles des zones.
                </div>
              )}

              <button
                onClick={applyGlobalToAllZones}
                disabled={applyingGlobal || zones.length === 0}
                className="btn-primary w-full justify-center text-sm disabled:opacity-40"
              >
                {applyingGlobal
                  ? <><div className="w-3.5 h-3.5 border-2 border-white/40 border-t-white rounded-full animate-spin"/>&nbsp;Application…</>
                  : `Appliquer ×${globalMultiplierInput || '…'} à toutes les zones (${zones.length})`
                }
              </button>
            </div>

            {/* Localisation météo */}
            <div className="space-y-3">
              <div className="text-xs font-bold text-slate-500 uppercase tracking-widest">Localisation météo</div>
              <div className="flex flex-wrap gap-2">
                {Object.entries(COUNTRY_COORDS).map(([code, { city }]) => (
                  <button key={code} onClick={() => pickCountryPreset(code)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${weatherCfg.country === code ? 'bg-brand-green text-white' : 'bg-navy-800 text-slate-400 border border-navy-600 hover:text-slate-200'}`}>
                    {code} · {city}
                  </button>
                ))}
              </div>
              {!weatherEditing ? (
                <div className="flex items-center gap-3">
                  <span className="text-xs text-slate-500 font-mono">{weatherCfg.lat}, {weatherCfg.lon}</span>
                  <button onClick={() => setWeatherEditing(true)} className="text-xs text-blue-400 hover:text-blue-300">
                    Coordonnées personnalisées
                  </button>
                </div>
              ) : (
                <div className="flex items-end gap-2 flex-wrap">
                  <div className="flex flex-col gap-1">
                    <label className="label text-[10px]">Latitude</label>
                    <input className="input text-sm w-32" inputMode="decimal" value={latInput} onChange={e => setLatInput(e.target.value)} placeholder="6.3676"/>
                  </div>
                  <div className="flex flex-col gap-1">
                    <label className="label text-[10px]">Longitude</label>
                    <input className="input text-sm w-32" inputMode="decimal" value={lonInput} onChange={e => setLonInput(e.target.value)} placeholder="2.4252"/>
                  </div>
                  <button onClick={applyWeatherCfgEdit} className="btn-primary text-xs px-3 self-end">Appliquer</button>
                  <button onClick={() => setWeatherEditing(false)} className="btn-secondary text-xs px-3 self-end">Annuler</button>
                </div>
              )}
            </div>

            {weather.isBad && (
              <div className="p-3 bg-blue-500/10 border border-blue-500/30 rounded-xl text-xs text-blue-300 font-semibold">
                Météo défavorable détectée — le multiplicateur global ×{weatherCfg.globalMultiplier > 1 ? weatherCfg.globalMultiplier : 'individuel'} est actif sur toutes les zones.
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
            globalWeatherEnabled={weatherCfg.enabled}
            globalMultiplier={weatherCfg.globalMultiplier}
          />
        )}
      </Modal>
    </div>
  )
}
