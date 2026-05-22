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

// ─── Onglet Commissions ───────────────────────────────────────────────────────
const CommissionsTab: React.FC = () => {
  const qc = useQueryClient()
  const [commType, setCommType] = useState<'PERCENTAGE' | 'FIXED_AMOUNT'>('PERCENTAGE')
  const [commValue, setCommValue] = useState('15')
  const [configLoaded, setConfigLoaded] = useState(false)

  const { data: stats, isLoading: statsLoading } = useQuery({
    queryKey: ['commission-stats'],
    queryFn: () => api.get('/admin/payments/commissions').then(unwrap),
  })

  useQuery({
    queryKey: ['commission-config'],
    queryFn: () => api.get('/admin/config/commission').then(unwrap),
    staleTime: Infinity,
    refetchOnWindowFocus: false,
    enabled: !configLoaded,
    select: (d: any) => {
      if (!configLoaded) {
        setCommType(d?.type ?? 'PERCENTAGE')
        setCommValue(String(d?.value ?? '15'))
        setConfigLoaded(true)
      }
      return d
    },
  })

  const saveMutation = useMutation({
    mutationFn: () => api.put('/admin/config/commission', { type: commType, value: Number(commValue) }),
    onSuccess: () => { toast.success('Commission mise à jour !'); qc.invalidateQueries({ queryKey: ['commission-config'] }) },
    onError: (e: any) => toast.error(e.message),
  })

  const monthly: any[] = stats?.monthly ?? []
  const maxComm = Math.max(...monthly.map((m: any) => m.commissions), 1)
  const topCommissioners: any[] = stats?.topCommissioners ?? []

  return (
    <div className="space-y-5">
      {/* KPIs */}
      <div className="grid grid-cols-2 gap-4">
        <div className="card p-4 flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-brand-green/10 border border-brand-green/20 flex items-center justify-center flex-shrink-0">
            <TrendingUp size={18} className="text-brand-green"/>
          </div>
          <div>
            <div className="text-xl font-black text-slate-100">{stats ? formatCFA(stats.totalRevenue) : '—'}</div>
            <div className="text-xs text-slate-500 font-semibold">CA total (toutes périodes)</div>
          </div>
        </div>
        <div className="card p-4 flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-yellow-500/10 border border-yellow-500/20 flex items-center justify-center flex-shrink-0">
            <DollarSign size={18} className="text-yellow-400"/>
          </div>
          <div>
            <div className="text-xl font-black text-slate-100">{stats ? formatCFA(stats.totalCommissions) : '—'}</div>
            <div className="text-xs text-slate-500 font-semibold">Commissions totales</div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-5">
        {/* Config */}
        <div className="card p-5 space-y-4">
          <div className="flex items-center gap-2">
            <DollarSign size={15} className="text-brand-green"/>
            <span className="font-black text-slate-100 text-sm">Taux de commission</span>
          </div>
          <div className="flex gap-2">
            {(['PERCENTAGE', 'FIXED_AMOUNT'] as const).map(t => (
              <button key={t} onClick={() => setCommType(t)}
                className={`flex-1 py-2 rounded-xl text-xs font-bold transition-all ${commType === t ? 'bg-brand-green text-white' : 'bg-navy-700 text-slate-400 border border-navy-600'}`}>
                {t === 'PERCENTAGE' ? '% Pourcentage' : 'Montant fixe'}
              </button>
            ))}
          </div>
          <div>
            <label className="label">{commType === 'PERCENTAGE' ? 'Taux (%)' : 'Montant (FCFA)'}</label>
            <input value={commValue} onChange={e => setCommValue(e.target.value)} type="number" className="input w-full" placeholder="15"/>
            <p className="text-xs text-slate-500 mt-1.5 font-medium">
              {commType === 'PERCENTAGE'
                ? `${commValue}% prélevés sur le sous-total de chaque commande`
                : `${formatCFA(Number(commValue) || 0)} fixes par commande`}
            </p>
          </div>
          <button
            onClick={() => {
              const v = Number(commValue)
              if (isNaN(v) || v < 0) { toast.error('Valeur invalide'); return }
              if (commType === 'PERCENTAGE' && v > 100) { toast.error('Taux max 100%'); return }
              saveMutation.mutate()
            }}
            disabled={saveMutation.isPending}
            className="btn-primary w-full justify-center">
            <Save size={14}/> Enregistrer
          </button>
        </div>

        {/* Tendance mensuelle */}
        <div className="card p-5">
          <div className="flex items-center gap-2 mb-4">
            <BarChart3 size={15} className="text-brand-green"/>
            <span className="font-black text-slate-100 text-sm">Commissions — 6 mois</span>
          </div>
          {statsLoading
            ? <div className="flex justify-center py-8"><div className="w-6 h-6 border-2 border-brand-green border-t-transparent rounded-full animate-spin"/></div>
            : (
              <div className="space-y-2.5">
                {monthly.map((m: any) => {
                  const [year, month] = m.month.split('-')
                  return <MonthBar key={m.month} value={m.commissions} max={maxComm} label={`${MONTH_LABELS[month] ?? month} ${year.slice(2)}`}/>
                })}
              </div>
            )
          }
        </div>
      </div>

      {/* Top établissements */}
      <div className="card p-5">
        <div className="flex items-center gap-2 mb-4">
          <Building2 size={15} className="text-brand-green"/>
          <span className="font-black text-slate-100 text-sm">Top 5 — Commissions générées</span>
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
                      <div className="text-xs text-slate-500">{item.orders} commande{item.orders > 1 ? 's' : ''} · CA {formatCFA(item.revenue)}</div>
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
