import React, { useState, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import api from '../../services/api'
import { DataTable } from '../../components/ui/DataTable'
import { Badge } from '../../components/ui/Badge'
import { formatCFA, formatDateTime } from '../../utils/format'
import {
  CreditCard, DollarSign, TrendingUp, Truck, ArrowUpDown,
  Save, RefreshCw, CheckCircle, XCircle, Clock, ExternalLink,
  BarChart3, Building2, MapPin,
} from 'lucide-react'
import toast from 'react-hot-toast'

const unwrap = (r: any) => r?.data?.data ?? r?.data ?? r

const MONTH_LABELS: Record<string, string> = {
  '01': 'Jan', '02': 'Fév', '03': 'Mar', '04': 'Avr',
  '05': 'Mai', '06': 'Jun', '07': 'Jul', '08': 'Aoû',
  '09': 'Sep', '10': 'Oct', '11': 'Nov', '12': 'Déc',
}

const TX_TYPE_LABELS: Record<string, string> = {
  COMMISSION: 'Commission',
  PAYOUT: 'Virement',
  REFUND: 'Remboursement',
  DELIVERY_FEE: 'Frais livraison',
  TIP: 'Pourboire',
}

const TX_STATUS_LABELS: Record<string, string> = {
  PENDING: 'En attente',
  COMPLETED: 'Complété',
  FAILED: 'Échoué',
}

const GATEWAY_ICONS: Record<string, string> = {
  STRIPE: '💳', PAYPAL: '🅿️', KKIAPAY: '📱', FEDAPAY: '🟢', OTHER: '💰',
}
const GATEWAY_LABELS: Record<string, string> = {
  STRIPE: 'International', PAYPAL: 'Mondial', KKIAPAY: 'Mobile Money', FEDAPAY: 'Bénin', OTHER: 'Autre',
}

function MonthBar({ value, max, label }: { value: number; max: number; label: string }) {
  const pct = max > 0 ? Math.round((value / max) * 100) : 0
  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between text-xs">
        <span className="text-slate-400 font-semibold w-14">{label}</span>
        <span className="text-slate-300 font-bold">{formatCFA(value)}</span>
      </div>
      <div className="h-2 bg-navy-700 rounded-full overflow-hidden">
        <div className="h-full bg-brand-green rounded-full transition-all" style={{ width: `${pct}%` }}/>
      </div>
    </div>
  )
}

const COUNTRIES = [
  { code: 'BJ', name: 'Bénin' },
  { code: 'SN', name: 'Sénégal' },
  { code: 'CI', name: "Côte d'Ivoire" },
  { code: 'TG', name: 'Togo' },
]

type CommRate = { type: 'PERCENTAGE' | 'FIXED_PER_DISH'; value: string }
const defaultRate = (): CommRate => ({ type: 'PERCENTAGE', value: '' })

const COMM_TYPE_LABELS: Record<string, { short: string; desc: string }> = {
  PERCENTAGE: {
    short: '% Taux',
    desc: 'Déduit du CA du pro. Invisible dans le prix affiché au client.',
  },
  FIXED_PER_DISH: {
    short: 'Fixe / plat (FCFA)',
    desc: 'Ajouté automatiquement au prix de chaque plat. Transparent côté client.',
  },
}

function CommRateForm({ label, rate, onChange }: { label: string; rate: CommRate; onChange: (r: CommRate) => void }) {
  return (
    <div className="space-y-2">
      <div className="text-xs font-bold text-slate-400 uppercase tracking-wider">{label}</div>
      <div className="flex gap-2">
        {(['PERCENTAGE', 'FIXED_PER_DISH'] as const).map(t => (
          <button key={t} type="button" onClick={() => onChange({ ...rate, type: t })}
            className={`flex-1 py-1.5 rounded-lg text-xs font-bold transition-all ${rate.type === t ? 'bg-brand-green text-white' : 'bg-navy-700 text-slate-400 border border-navy-600'}`}>
            {COMM_TYPE_LABELS[t].short}
          </button>
        ))}
      </div>
      <input
        type="number" min="0"
        value={rate.value}
        onChange={e => onChange({ ...rate, value: e.target.value })}
        className="input w-full text-sm"
        placeholder={rate.type === 'PERCENTAGE' ? 'ex: 15' : 'ex: 500'}
      />
      <p className="text-[10px] text-slate-500">{COMM_TYPE_LABELS[rate.type]?.desc}</p>
      <p className="text-[11px] text-brand-green font-medium">
        {rate.type === 'PERCENTAGE'
          ? `→ ${rate.value || '…'}% ${label === 'Professionnels' ? 'du sous-total' : 'des frais de livraison'}`
          : `→ ${rate.value ? formatCFA(Number(rate.value)) : '…'} ajouté ${label === 'Professionnels' ? 'par plat' : 'par livraison'}`}
      </p>
    </div>
  )
}

// ─── Onglet Commissions ───────────────────────────────────────────────────────
const CommissionsTab: React.FC = () => {
  const qc = useQueryClient()
  const [filterCountry, setFilterCountry] = useState('')
  const [configLoaded, setConfigLoaded] = useState(false)

  // Global rates
  const [proRate, setProRate]     = useState<CommRate>({ type: 'PERCENTAGE', value: '15' })
  const [driverRate, setDriverRate] = useState<CommRate>({ type: 'PERCENTAGE', value: '10' })

  // Per-country overrides: { BJ: { pro: CommRate, driver: CommRate, enabled: boolean } }
  const [countryOverrides, setCountryOverrides] = useState<Record<string, { pro: CommRate; driver: CommRate; enabled: boolean }>>({})

  const { data: stats, isLoading: statsLoading, refetch: refetchStats } = useQuery({
    queryKey: ['commission-stats', filterCountry],
    queryFn: () => {
      const p = filterCountry ? `?country=${filterCountry}` : ''
      return api.get(`/admin/payments/commissions${p}`).then(unwrap)
    },
  })

  useQuery({
    queryKey: ['commission-config'],
    queryFn: () => api.get('/admin/config/commission').then(unwrap),
    staleTime: Infinity,
    refetchOnWindowFocus: false,
    enabled: !configLoaded,
    select: (d: any) => {
      const normType = (t?: string): CommRate['type'] =>
        (t === 'FIXED_AMOUNT' || t === 'FIXED_PER_DISH') ? 'FIXED_PER_DISH' : 'PERCENTAGE'
      if (!configLoaded && d) {
        setProRate({ type: normType(d.professional?.type), value: String(d.professional?.value ?? '15') })
        setDriverRate({ type: normType(d.driver?.type), value: String(d.driver?.value ?? '10') })
        // Load country overrides
        const overrides: Record<string, { pro: CommRate; driver: CommRate; enabled: boolean }> = {}
        if (d.countries) {
          for (const [code, cfg] of Object.entries(d.countries as any)) {
            const c = cfg as any
            overrides[code] = {
              enabled: true,
              pro:    { type: normType(c.professional?.type), value: String(c.professional?.value ?? '') },
              driver: { type: normType(c.driver?.type),       value: String(c.driver?.value ?? '') },
            }
          }
        }
        setCountryOverrides(overrides)
        setConfigLoaded(true)
      }
      return d
    },
  })

  const saveMutation = useMutation({
    mutationFn: () => {
      const validate = (r: CommRate, label: string) => {
        const v = Number(r.value)
        if (!r.value.trim() || isNaN(v) || v < 0) throw new Error(`${label} : valeur invalide`)
        if (r.type === 'PERCENTAGE' && v > 100) throw new Error(`${label} : taux max 100%`)
        return { type: r.type, value: v }
      }
      const professional = validate(proRate, 'Professionnels')
      const driver       = validate(driverRate, 'Livreurs')
      const countries: Record<string, any> = {}
      for (const [code, ov] of Object.entries(countryOverrides)) {
        if (!ov.enabled) continue
        const pro = ov.pro.value.trim()
          ? { type: ov.pro.type, value: Number(ov.pro.value) }
          : undefined
        const drv = ov.driver.value.trim()
          ? { type: ov.driver.type, value: Number(ov.driver.value) }
          : undefined
        if (pro || drv) countries[code] = { ...(pro && { professional: pro }), ...(drv && { driver: drv }) }
      }
      return api.put('/admin/config/commission', { professional, driver, countries })
    },
    onSuccess: () => { toast.success('Configuration sauvegardée !'); qc.invalidateQueries({ queryKey: ['commission-config'] }); refetchStats() },
    onError: (e: any) => toast.error(e.message),
  })

  const toggleCountryOverride = (code: string) => {
    setCountryOverrides(prev => {
      if (prev[code]) {
        const next = { ...prev }
        delete next[code]
        return next
      }
      return { ...prev, [code]: { enabled: true, pro: defaultRate(), driver: defaultRate() } }
    })
  }

  const updateCountryRate = (code: string, field: 'pro' | 'driver', rate: CommRate) => {
    setCountryOverrides(prev => ({ ...prev, [code]: { ...prev[code], [field]: rate } }))
  }

  const monthly: any[] = stats?.monthly ?? []
  const maxTotal = Math.max(...monthly.map((m: any) => (m.proCommissions ?? 0) + (m.driverCommissions ?? 0)), 1)
  const topCommissioners: any[] = stats?.topCommissioners ?? []

  const totalPlatform = stats?.totalPlatformCommissions ?? 0
  const totalPro      = stats?.totalProCommissions ?? 0
  const totalDriver   = stats?.totalDriverCommissions ?? 0
  const totalRevenue  = stats?.totalRevenue ?? 0

  return (
    <div className="space-y-5">
      {/* Filtre pays */}
      <div className="flex items-center gap-3 flex-wrap">
        <span className="text-xs font-bold text-slate-500">Filtrer les stats par pays :</span>
        {[{ code: '', name: 'Tous' }, ...COUNTRIES].map(c => (
          <button key={c.code} onClick={() => setFilterCountry(c.code)}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${filterCountry === c.code ? 'bg-brand-green text-white' : 'bg-navy-800 text-slate-400 border border-navy-600 hover:text-slate-200'}`}>
            {c.name}
          </button>
        ))}
        <button onClick={() => refetchStats()} className="ml-auto p-2 text-slate-400 hover:text-white hover:bg-navy-700 rounded-lg">
          <RefreshCw size={14} className={statsLoading ? 'animate-spin' : ''}/>
        </button>
      </div>

      {/* KPIs — Modèle global : plateforme = pros + livreurs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="card p-4 flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-brand-green/10 border border-brand-green/20 flex items-center justify-center flex-shrink-0">
            <TrendingUp size={18} className="text-brand-green"/>
          </div>
          <div>
            <div className="text-lg font-black text-slate-100">{formatCFA(totalRevenue)}</div>
            <div className="text-xs text-slate-500 font-semibold">CA {filterCountry || 'total'}</div>
          </div>
        </div>
        <div className="card p-4 flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-yellow-500/10 border border-yellow-500/20 flex items-center justify-center flex-shrink-0">
            <Building2 size={18} className="text-yellow-400"/>
          </div>
          <div>
            <div className="text-lg font-black text-slate-100">{formatCFA(totalPro)}</div>
            <div className="text-xs text-slate-500 font-semibold">Commissions pros</div>
          </div>
        </div>
        <div className="card p-4 flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center flex-shrink-0">
            <Truck size={18} className="text-blue-400"/>
          </div>
          <div>
            <div className="text-lg font-black text-slate-100">{formatCFA(totalDriver)}</div>
            <div className="text-xs text-slate-500 font-semibold">Commissions livreurs</div>
          </div>
        </div>
        <div className="card p-4 flex items-center gap-3 border border-brand-green/30">
          <div className="w-10 h-10 rounded-xl bg-brand-green/20 border border-brand-green/30 flex items-center justify-center flex-shrink-0">
            <DollarSign size={18} className="text-brand-green"/>
          </div>
          <div>
            <div className="text-lg font-black text-brand-green">{formatCFA(totalPlatform)}</div>
            <div className="text-xs text-slate-400 font-bold">= Plateforme total</div>
          </div>
        </div>
      </div>

      {/* Configuration globale */}
      <div className="card p-5 space-y-5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <DollarSign size={15} className="text-brand-green"/>
            <span className="font-black text-slate-100 text-sm">Taux globaux (par défaut)</span>
          </div>
          <span className="text-[10px] text-slate-500 font-semibold bg-navy-700 px-2 py-1 rounded-lg">
            Commission plateforme = Pros + Livreurs
          </span>
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-2 gap-5">
          {/* Professionnels */}
          <div className="card-sm p-4 space-y-3 border-l-2 border-yellow-500/50">
            <CommRateForm label="Professionnels" rate={proRate} onChange={setProRate}/>
          </div>
          {/* Livreurs */}
          <div className="card-sm p-4 space-y-3 border-l-2 border-blue-500/50">
            <CommRateForm label="Livreurs" rate={driverRate} onChange={setDriverRate}/>
          </div>
        </div>

        {/* Overrides par pays */}
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <MapPin size={13} className="text-slate-400"/>
            <span className="text-xs font-bold text-slate-400">Surcharges par pays (optionnel)</span>
          </div>
          <div className="flex flex-wrap gap-2">
            {COUNTRIES.map(c => {
              const active = !!countryOverrides[c.code]
              return (
                <button key={c.code} onClick={() => toggleCountryOverride(c.code)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${active ? 'bg-brand-green/15 border border-brand-green/40 text-brand-green' : 'bg-navy-800 text-slate-500 border border-navy-600 hover:text-slate-300'}`}>
                  {active ? '✓ ' : '+ '}{c.name}
                </button>
              )
            })}
          </div>
          {Object.entries(countryOverrides).map(([code, ov]) => {
            const cName = COUNTRIES.find(c => c.code === code)?.name ?? code
            return (
              <div key={code} className="card-sm p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-black text-slate-300">{cName} — taux spécifiques</span>
                  <button onClick={() => toggleCountryOverride(code)} className="text-xs text-red-400 hover:text-red-300 font-bold">Supprimer</button>
                </div>
                <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
                  <div className="border-l-2 border-yellow-500/40 pl-3">
                    <CommRateForm label="Professionnels" rate={ov.pro} onChange={r => updateCountryRate(code, 'pro', r)}/>
                  </div>
                  <div className="border-l-2 border-blue-500/40 pl-3">
                    <CommRateForm label="Livreurs" rate={ov.driver} onChange={r => updateCountryRate(code, 'driver', r)}/>
                  </div>
                </div>
              </div>
            )
          })}
        </div>

        <button onClick={() => saveMutation.mutate()} disabled={saveMutation.isPending}
          className="btn-primary w-full justify-center">
          <Save size={14}/> Enregistrer la configuration
        </button>
      </div>

      {/* Stats : tendance + top pros */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-5">
        {/* Tendance mensuelle pros + livreurs */}
        <div className="card p-5">
          <div className="flex items-center gap-2 mb-4">
            <BarChart3 size={15} className="text-brand-green"/>
            <span className="font-black text-slate-100 text-sm">Tendance — 6 mois</span>
          </div>
          {statsLoading
            ? <div className="flex justify-center py-8"><div className="w-6 h-6 border-2 border-brand-green border-t-transparent rounded-full animate-spin"/></div>
            : (
              <div className="space-y-3">
                {monthly.map((m: any) => {
                  const [year, month] = m.month.split('-')
                  const label = `${MONTH_LABELS[month] ?? month} ${year.slice(2)}`
                  const pro    = m.proCommissions    ?? 0
                  const driver = m.driverCommissions ?? 0
                  const total  = pro + driver
                  const pct    = maxTotal > 0 ? Math.round((total / maxTotal) * 100) : 0
                  const proPct = total > 0 ? Math.round((pro / total) * 100) : 0
                  return (
                    <div key={m.month} className="space-y-1">
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-slate-400 font-semibold w-14">{label}</span>
                        <span className="text-slate-400 text-[10px]">
                          <span className="text-yellow-400">{formatCFA(pro)}</span>
                          {' + '}
                          <span className="text-blue-400">{formatCFA(driver)}</span>
                          {' = '}
                          <span className="text-slate-200 font-bold">{formatCFA(total)}</span>
                        </span>
                      </div>
                      <div className="h-2 bg-navy-700 rounded-full overflow-hidden flex">
                        <div className="h-full bg-yellow-500/70 transition-all" style={{ width: `${pct * proPct / 100}%` }}/>
                        <div className="h-full bg-blue-500/70 transition-all" style={{ width: `${pct * (100 - proPct) / 100}%` }}/>
                      </div>
                    </div>
                  )
                })}
                <div className="flex items-center gap-4 pt-1 text-[10px] text-slate-500 font-semibold">
                  <span className="flex items-center gap-1.5"><span className="w-3 h-1.5 rounded-full bg-yellow-500/70 inline-block"/>Professionnels</span>
                  <span className="flex items-center gap-1.5"><span className="w-3 h-1.5 rounded-full bg-blue-500/70 inline-block"/>Livreurs</span>
                </div>
              </div>
            )
          }
        </div>

        {/* Top établissements */}
        <div className="card p-5">
          <div className="flex items-center gap-2 mb-4">
            <Building2 size={15} className="text-brand-green"/>
            <span className="font-black text-slate-100 text-sm">Top 5 — Établissements</span>
          </div>
          {statsLoading
            ? <div className="flex justify-center py-8"><div className="w-6 h-6 border-2 border-brand-green border-t-transparent rounded-full animate-spin"/></div>
            : topCommissioners.length === 0
              ? <div className="text-center py-8 text-slate-500 text-sm">Aucune donnée</div>
              : (
                <div className="space-y-2">
                  {topCommissioners.map((item: any, i: number) => (
                    <div key={i} className="flex items-center gap-3 p-3 card-sm">
                      <div className={`w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 text-xs font-black
                        ${i === 0 ? 'bg-yellow-500/20 text-yellow-400' : i === 1 ? 'bg-slate-500/20 text-slate-300' : i === 2 ? 'bg-orange-500/20 text-orange-400' : 'bg-navy-700 text-slate-500'}`}>
                        {i + 1}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-bold text-slate-200 truncate">{item.professional?.businessName || '—'}</div>
                        <div className="text-xs text-slate-500">{item.orders} cmd · CA {formatCFA(item.revenue)}</div>
                      </div>
                      <div className="text-right flex-shrink-0">
                        <div className="text-sm font-black text-brand-green">{formatCFA(item.commissions)}</div>
                        <div className="text-[10px] text-slate-500">
                          {item.revenue > 0 ? `${Math.round((item.commissions / item.revenue) * 100)}%` : '—'}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )
          }
        </div>
      </div>
    </div>
  )
}

// ─── Onglet Frais de livraison ────────────────────────────────────────────────
const DeliveryFeesTab: React.FC = () => {
  const navigate = useNavigate()
  const { data: stats, isLoading } = useQuery({
    queryKey: ['delivery-fee-stats'],
    queryFn: () => api.get('/admin/payments/delivery-fee-stats').then(unwrap),
  })

  const monthly: any[] = stats?.monthly ?? []
  const topCities: any[] = stats?.topCities ?? []
  const maxFees = Math.max(...monthly.map((m: any) => m.fees), 1)

  return (
    <div className="space-y-5">
      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
        <div className="card p-4 flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-brand-green/10 border border-brand-green/20 flex items-center justify-center flex-shrink-0">
            <Truck size={18} className="text-brand-green"/>
          </div>
          <div>
            <div className="text-xl font-black text-slate-100">{stats ? formatCFA(stats.totalFees) : '—'}</div>
            <div className="text-xs text-slate-500 font-semibold">Frais collectés (total)</div>
          </div>
        </div>
        <div className="card p-4 flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center flex-shrink-0">
            <ArrowUpDown size={18} className="text-blue-400"/>
          </div>
          <div>
            <div className="text-xl font-black text-slate-100">{stats ? formatCFA(stats.avgFee) : '—'}</div>
            <div className="text-xs text-slate-500 font-semibold">Frais moyen / commande</div>
          </div>
        </div>
        <div className="card p-4 flex items-center gap-3 col-span-2 lg:col-span-1">
          <div className="w-10 h-10 rounded-xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center flex-shrink-0">
            <ArrowUpDown size={18} className="text-purple-400"/>
          </div>
          <div>
            <div className="text-xl font-black text-slate-100">{stats?.totalOrders ?? '—'}</div>
            <div className="text-xs text-slate-500 font-semibold">Commandes avec livraison</div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-5">
        {/* Tendance */}
        <div className="card p-5">
          <div className="flex items-center gap-2 mb-4">
            <BarChart3 size={15} className="text-brand-green"/>
            <span className="font-black text-slate-100 text-sm">Frais — 6 mois</span>
          </div>
          {isLoading
            ? <div className="flex justify-center py-8"><div className="w-6 h-6 border-2 border-brand-green border-t-transparent rounded-full animate-spin"/></div>
            : (
              <div className="space-y-2.5">
                {monthly.map((m: any) => {
                  const [year, month] = m.month.split('-')
                  return <MonthBar key={m.month} value={m.fees} max={maxFees} label={`${MONTH_LABELS[month] ?? month} ${year.slice(2)}`}/>
                })}
              </div>
            )
          }
        </div>

        {/* Top villes */}
        <div className="card p-5">
          <div className="flex items-center gap-2 mb-4">
            <MapPin size={15} className="text-brand-green"/>
            <span className="font-black text-slate-100 text-sm">Top villes — Frais perçus</span>
          </div>
          {isLoading
            ? <div className="flex justify-center py-8"><div className="w-6 h-6 border-2 border-brand-green border-t-transparent rounded-full animate-spin"/></div>
            : topCities.length === 0
              ? <div className="text-center py-8 text-slate-500 text-sm">Aucune donnée</div>
              : (
                <div className="space-y-2">
                  {topCities.map((c: any, i: number) => (
                    <div key={c.city} className="flex items-center gap-3 p-3 card-sm">
                      <div className="w-7 h-7 rounded-full bg-navy-700 flex items-center justify-center flex-shrink-0 text-xs font-black text-slate-400">{i + 1}</div>
                      <div className="flex-1">
                        <div className="text-sm font-bold text-slate-200">{c.city}</div>
                        <div className="text-xs text-slate-500">{c.orders} livraison{c.orders > 1 ? 's' : ''}</div>
                      </div>
                      <div className="text-sm font-black text-brand-green">{formatCFA(c.fees)}</div>
                    </div>
                  ))}
                </div>
              )
          }
        </div>
      </div>

      <div className="card p-4 flex items-center justify-between gap-4">
        <div>
          <div className="text-sm font-bold text-slate-200">Configurer les zones et tarifs</div>
          <div className="text-xs text-slate-500">Gérez les zones, le mode de calcul (km/zone/ville) et le facteur météo</div>
        </div>
        <button onClick={() => navigate('/delivery-fees')} className="btn-secondary text-xs px-4 gap-2 flex-shrink-0">
          <ExternalLink size={13}/> Aller à la config
        </button>
      </div>
    </div>
  )
}

// ─── Onglet Passerelles ───────────────────────────────────────────────────────
const GatewaysTab: React.FC = () => {
  const qc = useQueryClient()
  const [gateways, setGateways] = useState({ STRIPE: true, PAYPAL: true, KKIAPAY: true, FEDAPAY: true })
  const [loaded, setLoaded] = useState(false)

  const { data: payStats, isLoading: statsLoading } = useQuery({
    queryKey: ['payment-stats'],
    queryFn: () => api.get('/admin/payments/stats').then(unwrap),
  })

  useQuery({
    queryKey: ['gateway-config'],
    queryFn: () => api.get('/admin/config/platform').then(unwrap),
    staleTime: Infinity,
    refetchOnWindowFocus: false,
    enabled: !loaded,
    select: (d: any) => {
      if (!loaded && d?.paymentGateways) {
        setGateways(g => ({ ...g, ...d.paymentGateways }))
        setLoaded(true)
      }
      return d
    },
  })

  const saveMutation = useMutation({
    mutationFn: () => api.put('/admin/config/payment-gateways', gateways),
    onSuccess: () => { toast.success('Passerelles mises à jour !'); qc.invalidateQueries({ queryKey: ['gateway-config'] }) },
    onError: (e: any) => toast.error(e.message),
  })

  const gatewayStats: any[] = payStats?.gatewayStats ?? []

  return (
    <div className="space-y-5">
      {/* Volume par passerelle */}
      {!statsLoading && gatewayStats.length > 0 && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {gatewayStats.map((g: any) => (
            <div key={g.gateway} className="card p-4">
              <div className="flex items-center gap-2 mb-2">
                <span className="text-lg">{GATEWAY_ICONS[g.gateway] ?? '💰'}</span>
                <span className="text-xs font-black text-slate-300">{g.gateway}</span>
              </div>
              <div className="text-base font-black text-slate-100">{formatCFA(g.total)}</div>
              <div className="text-xs text-slate-500">{g.count} transaction{g.count > 1 ? 's' : ''}</div>
            </div>
          ))}
        </div>
      )}

      {/* Toggle passerelles */}
      <div className="card p-5 space-y-4">
        <div className="flex items-center gap-2">
          <CreditCard size={15} className="text-brand-green"/>
          <span className="font-black text-slate-100 text-sm">Activer / Désactiver les passerelles</span>
        </div>
        <div className="space-y-3">
          {Object.entries(gateways).map(([name, enabled]) => (
            <div key={name} className="flex items-center gap-3 p-3 bg-navy-900 rounded-xl border border-navy-700">
              <span className="text-lg flex-shrink-0">{GATEWAY_ICONS[name] ?? '💰'}</span>
              <div className="flex-1">
                <div className="text-sm font-bold text-slate-200">{name}</div>
                <div className="text-xs text-slate-500">{GATEWAY_LABELS[name] ?? '—'}</div>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input type="checkbox" checked={enabled} onChange={e => setGateways(g => ({ ...g, [name]: e.target.checked }))} className="sr-only peer"/>
                <div className="w-10 h-5 bg-navy-700 rounded-full peer peer-checked:after:translate-x-5 peer-checked:bg-brand-green after:content-[''] after:absolute after:top-0.5 after:left-[2px] after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all"/>
              </label>
            </div>
          ))}
        </div>
        <button
          onClick={() => {
            if (!Object.values(gateways).some(Boolean)) { toast.error('Au moins une passerelle doit rester active'); return }
            saveMutation.mutate()
          }}
          disabled={saveMutation.isPending}
          className="btn-primary w-full justify-center">
          <Save size={14}/> Enregistrer
        </button>
      </div>
    </div>
  )
}

// ─── Onglet Virements ─────────────────────────────────────────────────────────
const PayoutsTab: React.FC = () => {
  const qc = useQueryClient()
  const [statusFilter, setStatusFilter] = useState('PENDING')

  const { data, isLoading, isFetching, refetch } = useQuery({
    queryKey: ['payouts', statusFilter],
    queryFn: () => {
      const p = new URLSearchParams({ type: 'PAYOUT', limit: '100' })
      if (statusFilter) p.set('status', statusFilter)
      return api.get(`/admin/payments/transactions?${p}`).then(unwrap)
    },
  })

  const transactions: any[] = Array.isArray(data) ? data : []

  const statusMutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: string }) =>
      api.patch(`/admin/transactions/${id}/status`, { status }),
    onSuccess: () => {
      toast.success('Statut mis à jour')
      qc.invalidateQueries({ queryKey: ['payouts'] })
    },
    onError: (e: any) => toast.error(e.message),
  })

  const columns = [
    {
      key: 'recipient', label: 'Destinataire',
      render: (r: any) => (
        <div>
          <div className="text-sm font-bold text-slate-200">
            {r.professional?.businessName || r.driver?.user?.name || '—'}
          </div>
          <div className="text-xs text-slate-500">{r.driver?.user?.phone || '—'}</div>
        </div>
      ),
    },
    {
      key: 'amount', label: 'Montant',
      sortable: true,
      sortValue: (r: any) => r.amount,
      render: (r: any) => <span className="font-black text-slate-100">{formatCFA(r.amount)}</span>,
    },
    {
      key: 'status', label: 'Statut',
      render: (r: any) => <Badge status={r.status}/>,
    },
    {
      key: 'reference', label: 'Référence', hideOnMobile: true,
      render: (r: any) => <span className="text-xs font-mono text-slate-400">{r.reference || '—'}</span>,
    },
    {
      key: 'createdAt', label: 'Date', hideOnMobile: true,
      sortable: true,
      sortValue: (r: any) => r.createdAt ? new Date(r.createdAt).getTime() : 0,
      render: (r: any) => <span className="text-xs text-slate-400">{formatDateTime(r.createdAt)}</span>,
    },
    {
      key: 'actions', label: '',
      render: (r: any) => r.status === 'PENDING' ? (
        <div className="flex gap-1">
          <button
            title="Marquer complété"
            onClick={e => { e.stopPropagation(); statusMutation.mutate({ id: r.id, status: 'COMPLETED' }) }}
            className="p-1.5 text-green-400 hover:bg-green-500/10 rounded-lg">
            <CheckCircle size={14}/>
          </button>
          <button
            title="Marquer échoué"
            onClick={e => { e.stopPropagation(); statusMutation.mutate({ id: r.id, status: 'FAILED' }) }}
            className="p-1.5 text-red-400 hover:bg-red-500/10 rounded-lg">
            <XCircle size={14}/>
          </button>
        </div>
      ) : null,
    },
  ]

  return (
    <div className="space-y-4">
      <div className="card p-4 flex flex-wrap gap-3 items-center">
        {[
          { value: 'PENDING',   label: 'En attente', icon: Clock,        cls: 'text-yellow-400' },
          { value: 'COMPLETED', label: 'Complétés',  icon: CheckCircle,  cls: 'text-green-400' },
          { value: 'FAILED',    label: 'Échoués',    icon: XCircle,      cls: 'text-red-400' },
          { value: '',          label: 'Tous',        icon: ArrowUpDown, cls: 'text-slate-400' },
        ].map(opt => (
          <button key={opt.value} onClick={() => setStatusFilter(opt.value)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${statusFilter === opt.value ? 'bg-brand-green text-white' : 'bg-navy-800 text-slate-400 border border-navy-600 hover:text-slate-200'}`}>
            <opt.icon size={12}/> {opt.label}
          </button>
        ))}
        <button onClick={() => refetch()} className="ml-auto p-2 text-slate-400 hover:text-white hover:bg-navy-700 rounded-lg">
          <RefreshCw size={14} className={isFetching ? 'animate-spin' : ''}/>
        </button>
      </div>
      <div className="card p-5">
        <DataTable
          columns={columns}
          data={transactions}
          loading={isLoading}
          exportable
          exportFilename="virements"
        />
      </div>
    </div>
  )
}

// ─── Onglet Transactions ──────────────────────────────────────────────────────
const TransactionsTab: React.FC = () => {
  const [typeFilter, setTypeFilter] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [from, setFrom] = useState('')
  const [to, setTo] = useState('')

  const { data, isLoading, isFetching, refetch } = useQuery({
    queryKey: ['all-transactions', typeFilter, statusFilter, from, to],
    queryFn: () => {
      const p = new URLSearchParams({ limit: '200' })
      if (typeFilter)   p.set('type', typeFilter)
      if (statusFilter) p.set('status', statusFilter)
      if (from && to)   { p.set('from', from); p.set('to', to) }
      return api.get(`/admin/payments/transactions?${p}`).then(unwrap)
    },
  })

  const transactions: any[] = Array.isArray(data) ? data : []

  const columns = [
    {
      key: 'type', label: 'Type',
      sortable: true,
      exportValue: (r: any) => TX_TYPE_LABELS[r.type] ?? r.type,
      render: (r: any) => (
        <span className="text-xs font-bold px-2 py-1 rounded-lg bg-navy-700 text-slate-300">
          {TX_TYPE_LABELS[r.type] ?? r.type}
        </span>
      ),
    },
    {
      key: 'recipient', label: 'Entité',
      render: (r: any) => (
        <div className="text-sm text-slate-300">
          {r.professional?.businessName || r.driver?.user?.name || '—'}
        </div>
      ),
    },
    {
      key: 'amount', label: 'Montant',
      sortable: true,
      sortValue: (r: any) => r.amount,
      exportValue: (r: any) => r.amount,
      render: (r: any) => (
        <span className={`font-black text-sm ${r.type === 'REFUND' ? 'text-red-400' : 'text-slate-100'}`}>
          {r.type === 'REFUND' ? '-' : ''}{formatCFA(r.amount)}
        </span>
      ),
    },
    { key: 'currency', label: 'Devise', hideOnMobile: true,
      render: (r: any) => <span className="text-xs text-slate-500">{r.currency}</span> },
    {
      key: 'status', label: 'Statut',
      exportValue: (r: any) => TX_STATUS_LABELS[r.status] ?? r.status,
      render: (r: any) => <Badge status={r.status}/>,
    },
    { key: 'reference', label: 'Référence', hideOnMobile: true,
      render: (r: any) => <span className="text-xs font-mono text-slate-500">{r.reference || '—'}</span> },
    {
      key: 'createdAt', label: 'Date', hideOnMobile: true,
      sortable: true,
      sortValue: (r: any) => r.createdAt ? new Date(r.createdAt).getTime() : 0,
      exportValue: (r: any) => r.createdAt,
      render: (r: any) => <span className="text-xs text-slate-400">{formatDateTime(r.createdAt)}</span>,
    },
  ]

  return (
    <div className="space-y-4">
      <div className="card p-4 flex flex-wrap gap-3 items-end">
        <div className="flex flex-col gap-1 min-w-[140px]">
          <label className="label text-[10px]">Type</label>
          <select className="input text-sm" value={typeFilter} onChange={e => setTypeFilter(e.target.value)}>
            <option value="">Tous les types</option>
            {Object.entries(TX_TYPE_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
          </select>
        </div>
        <div className="flex flex-col gap-1 min-w-[140px]">
          <label className="label text-[10px]">Statut</label>
          <select className="input text-sm" value={statusFilter} onChange={e => setStatusFilter(e.target.value)}>
            <option value="">Tous les statuts</option>
            {Object.entries(TX_STATUS_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
          </select>
        </div>
        <div className="flex flex-col gap-1">
          <label className="label text-[10px]">Du</label>
          <input type="date" className="input text-sm" value={from} onChange={e => setFrom(e.target.value)}/>
        </div>
        <div className="flex flex-col gap-1">
          <label className="label text-[10px]">Au</label>
          <input type="date" className="input text-sm" value={to} onChange={e => setTo(e.target.value)}/>
        </div>
        <button onClick={() => { setTypeFilter(''); setStatusFilter(''); setFrom(''); setTo('') }}
          className="btn-secondary text-xs px-3 self-end">Réinitialiser</button>
        <button onClick={() => refetch()} className="btn-primary text-xs px-3 self-end gap-1.5">
          <RefreshCw size={13} className={isFetching ? 'animate-spin' : ''}/> Actualiser
        </button>
      </div>
      <div className="card p-5">
        <DataTable
          columns={columns}
          data={transactions}
          loading={isLoading}
          exportable
          exportFilename="transactions"
        />
      </div>
    </div>
  )
}

// ─── Page principale ──────────────────────────────────────────────────────────
export const Payments: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'commissions' | 'delivery' | 'gateways' | 'payouts' | 'transactions'>('commissions')

  const { data: payStats } = useQuery({
    queryKey: ['payment-stats'],
    queryFn: () => api.get('/admin/payments/stats').then(unwrap),
  })

  const tabs = [
    { key: 'commissions',  label: 'Commissions',       icon: DollarSign },
    { key: 'delivery',     label: 'Frais livraison',   icon: Truck },
    { key: 'gateways',     label: 'Passerelles',        icon: CreditCard },
    { key: 'payouts',      label: 'Virements',          icon: ArrowUpDown },
    { key: 'transactions', label: 'Transactions',       icon: ArrowUpDown },
  ] as const

  return (
    <div className="space-y-5">
      {/* KPI globaux */}
      <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
        <div className="card p-4 flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-brand-green/10 border border-brand-green/20 flex items-center justify-center flex-shrink-0">
            <TrendingUp size={18} className="text-brand-green"/>
          </div>
          <div>
            <div className="text-xl font-black text-slate-100">{payStats ? formatCFA(payStats.monthlyRevenue) : '—'}</div>
            <div className="text-xs text-slate-500 font-semibold">CA ce mois</div>
          </div>
        </div>
        <div className="card p-4 flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-yellow-500/10 border border-yellow-500/20 flex items-center justify-center flex-shrink-0">
            <DollarSign size={18} className="text-yellow-400"/>
          </div>
          <div>
            <div className="text-xl font-black text-slate-100">{payStats ? formatCFA(payStats.monthlyCommissions) : '—'}</div>
            <div className="text-xs text-slate-500 font-semibold">Commissions ce mois</div>
          </div>
        </div>
        <div className="card p-4 flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-orange-500/10 border border-orange-500/20 flex items-center justify-center flex-shrink-0">
            <Clock size={18} className="text-orange-400"/>
          </div>
          <div>
            <div className="text-xl font-black text-slate-100">{payStats?.pendingPayouts ?? '—'}</div>
            <div className="text-xs text-slate-500 font-semibold">Virements en attente</div>
          </div>
        </div>
        <div className="card p-4 flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center flex-shrink-0">
            <ArrowUpDown size={18} className="text-blue-400"/>
          </div>
          <div>
            <div className="text-xl font-black text-slate-100">{payStats?.totalTransactions ?? '—'}</div>
            <div className="text-xs text-slate-500 font-semibold">Transactions totales</div>
          </div>
        </div>
      </div>

      {/* Menu horizontal */}
      <div className="flex gap-1.5 overflow-x-auto pb-1">
        {tabs.map(({ key, label, icon: Icon }) => (
          <button
            key={key}
            onClick={() => setActiveTab(key)}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold whitespace-nowrap transition-all flex-shrink-0
              ${activeTab === key ? 'bg-brand-green text-white' : 'bg-navy-800 text-slate-400 border border-navy-600 hover:text-slate-200'}`}>
            <Icon size={14}/>{label}
          </button>
        ))}
      </div>

      {/* Contenu */}
      {activeTab === 'commissions'  && <CommissionsTab/>}
      {activeTab === 'delivery'     && <DeliveryFeesTab/>}
      {activeTab === 'gateways'     && <GatewaysTab/>}
      {activeTab === 'payouts'      && <PayoutsTab/>}
      {activeTab === 'transactions' && <TransactionsTab/>}
    </div>
  )
}
