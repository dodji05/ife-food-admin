import React, { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import api from '../../services/api'
import { StatCard } from '../../components/ui/StatCard'
import { Badge } from '../../components/ui/Badge'
import { LocationPeriodFilters } from '../../components/ui/LocationPeriodFilters'
import { formatCFA } from '../../utils/format'
import { useFiltersStore } from '../../store/filters'
import { COUNTRIES } from '../../constants/countries'
import {
  ShoppingCart, TrendingUp, AlertCircle, Truck, CheckCircle2, ChefHat, XCircle,
  Coins, Receipt, Wallet, Gift, Briefcase, Globe,
  Trophy, User as UserIcon,
} from 'lucide-react'
import {
  ComposedChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, Bar,
  CartesianGrid, PieChart, Pie, Cell, Legend, BarChart,
} from 'recharts'

// ─── Constantes ──────────────────────────────────────────────────────────────

const CHART_COLORS = {
  primary: '#1A6B3C', yellow: '#F5C518', blue: '#3B82F6',
  purple: '#8B5CF6', red: '#EF4444', teal: '#14B8A6',
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

const trendPct = (curr: number, prev: number): number =>
  prev === 0 ? (curr > 0 ? 100 : 0) : Math.round(((curr - prev) / prev) * 100)

const fmtDate = (d: string) =>
  d ? new Date(d).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: '2-digit' }) : '…'

// ─── Tooltip charts ──────────────────────────────────────────────────────────

const CustomTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null
  return (
    <div className="bg-navy-800 border border-navy-600 rounded-xl p-3 shadow-xl">
      <p className="text-xs font-bold text-slate-400 mb-1">{label}</p>
      {payload.map((p: any) => (
        <p key={p.name ?? p.dataKey} className="text-sm font-bold" style={{ color: p.color ?? p.fill }}>
          {p.name === 'revenue' ? formatCFA(p.value) : `${p.value} commande${p.value !== 1 ? 's' : ''}`}
        </p>
      ))}
    </div>
  )
}

// ─── Composant principal ─────────────────────────────────────────────────────

export const Dashboard: React.FC = () => {
  const { period, country, dateFrom, dateTo } = useFiltersStore()
  const [region, setRegion] = useState('')
  const [city, setCity]     = useState('')

  const params = new URLSearchParams({
    period,
    ...(country  ? { country }       : {}),
    ...(city     ? { city }          : {}),
    ...(period === 'custom' && dateFrom ? { from: dateFrom } : {}),
    ...(period === 'custom' && dateTo   ? { to: dateTo }     : {}),
  })

  const { data: stats, isLoading, isFetching, refetch } = useQuery({
    queryKey: ['dashboard', period, country, city, dateFrom, dateTo],
    queryFn: () => api.get(`/admin/dashboard?${params}`).then((r: any) => r.data),
    refetchInterval: 30_000,
  })

  const { data: liveOrders = [], isLoading: liveLoading } = useQuery({
    queryKey: ['live-orders'],
    queryFn: () => api.get('/admin/orders?status=PAID,ACCEPTED,IN_PREPARATION,READY_FOR_PICKUP,DRIVER_ASSIGNED,PICKED_UP,IN_DELIVERY&limit=5')
      .then((r: any) => r?.data?.data ?? r?.data ?? []),
    refetchInterval: 15_000,
  })

  const counters      = stats?.counters       ?? {}
  const finance       = stats?.finance        ?? {}
  const chartData: any[] = stats?.chartData   ?? []
  const usersByRole   = stats?.usersByRole    ?? []
  const topCountries  = stats?.topCountries   ?? []
  const topClients    = stats?.topClients     ?? []
  const topDrivers    = stats?.topDrivers     ?? []
  const topPros       = stats?.topPros        ?? []
  const distinctCities: string[] = stats?.distinctCities ?? []

  // Tendances (période précédente)
  const prevData     = stats?.prev
  const trendOrders  = prevData ? trendPct(counters.total  ?? 0, prevData.orders?.count ?? 0)        : undefined
  const trendRevenue = prevData ? trendPct(finance.revenue ?? 0, Number(prevData.orders?.revenue ?? 0)) : undefined

  const periodLabel =
    period === 'day'    ? "Aujourd'hui"
    : period === 'month'  ? '30 derniers jours'
    : period === 'custom' ? `${fmtDate(dateFrom)} → ${fmtDate(dateTo)}`
    : '7 derniers jours'

  return (
    <div className="space-y-6">

      {/* ═══ Bloc 1 — Filtres globaux ═══════════════════════════════════════ */}
      <LocationPeriodFilters
        region={region} onRegionChange={setRegion}
        city={city}     onCityChange={setCity}
        cities={distinctCities}
        onRefresh={() => refetch()}
        isRefreshing={isFetching}
      />

      {/* ═══ Bloc 2 — Stats principales (12 cards) ══════════════════════════ */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        <StatCard title={`Commandes totales — ${periodLabel}`}
          value={counters.total ?? '—'} icon={ShoppingCart} color="brand-green"
          trend={trendOrders} loading={isLoading}/>
        <StatCard title="À valider"
          value={counters.toValidate ?? '—'} icon={AlertCircle} color="yellow" loading={isLoading}/>
        <StatCard title="En cours de traitement"
          value={counters.inPreparation ?? '—'} icon={ChefHat} color="blue" loading={isLoading}/>
        <StatCard title="Commandes livrées"
          value={counters.delivered ?? '—'} icon={CheckCircle2} color="brand-green" loading={isLoading}/>

        <StatCard title="Commandes annulées"
          value={counters.cancelled ?? '—'} icon={XCircle} color="red" loading={isLoading}/>
        <StatCard title="Chiffre d'affaires"
          value={isLoading ? '—' : formatCFA(finance.revenue ?? 0)} icon={TrendingUp} color="brand-green"
          trend={trendRevenue} loading={isLoading}/>
        <StatCard title="Frais de livraison"
          value={isLoading ? '—' : formatCFA(finance.deliveryFees ?? 0)} icon={Receipt} color="teal" loading={isLoading}/>
        <StatCard title="Commissions plateforme"
          value={isLoading ? '—' : formatCFA(finance.platformCommissions ?? 0)} icon={Coins} color="purple" loading={isLoading}/>

        <StatCard title="Revenus professionnels"
          value={isLoading ? '—' : formatCFA(finance.proRevenue ?? 0)} icon={Briefcase} color="blue" loading={isLoading}/>
        <StatCard title="Revenus livreurs"
          value={isLoading ? '—' : formatCFA(finance.driverRevenue ?? 0)} icon={Wallet} color="teal" loading={isLoading}/>
        <StatCard title="Pourboires livreurs"
          value={isLoading ? '—' : formatCFA(finance.driverTips ?? 0)} icon={Gift} color="yellow" loading={isLoading}/>
        <StatCard title="Livreurs actifs"
          value={stats?.activeDrivers ?? '—'} icon={Truck} color="brand-green" loading={isLoading}/>
      </div>

      {/* ═══ Bloc 3 — Graphiques ════════════════════════════════════════════ */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">

        {/* Revenus & Commandes — ComposedChart (Area + Bar, double axe) */}
        <div className="xl:col-span-2 card p-5">
          <ChartHeader title="Revenus & Commandes" subtitle={periodLabel}/>
          {chartData.length > 0 ? (
            <ResponsiveContainer width="100%" height={240}>
              <ComposedChart data={chartData} margin={{ top: 5, right: 5, bottom: 0, left: 0 }}>
                <defs>
                  <linearGradient id="gRevenue" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%"  stopColor={CHART_COLORS.primary} stopOpacity={0.3}/>
                    <stop offset="95%" stopColor={CHART_COLORS.primary} stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#1E3A6A" vertical={false}/>
                <XAxis dataKey="day" tick={{ fill: '#64748B', fontSize: 11, fontWeight: 600 }} axisLine={false} tickLine={false}/>
                <YAxis yAxisId="revenue" tick={{ fill: '#64748B', fontSize: 11 }} axisLine={false} tickLine={false}
                  tickFormatter={v => v >= 1000 ? `${(v/1000).toFixed(0)}k` : `${v}`}/>
                <YAxis yAxisId="orders" orientation="right" tick={{ fill: '#64748B', fontSize: 11 }} axisLine={false} tickLine={false} allowDecimals={false}/>
                <Tooltip content={<CustomTooltip/>}/>
                <Area yAxisId="revenue" type="monotone" dataKey="revenue"
                  stroke={CHART_COLORS.primary} strokeWidth={2.5} fill="url(#gRevenue)"
                  name="revenue" animationDuration={600}/>
                <Bar yAxisId="orders" dataKey="orders"
                  fill={CHART_COLORS.yellow} radius={[4, 4, 0, 0]} barSize={8}
                  name="orders" animationDuration={600}/>
              </ComposedChart>
            </ResponsiveContainer>
          ) : <EmptyChart loading={isLoading}/>}
        </div>

        {/* Pie users by role */}
        <div className="card p-5">
          <ChartHeader title="Utilisateurs par type" subtitle="Répartition globale"/>
          {usersByRole.length > 0 ? (
            <ResponsiveContainer width="100%" height={240}>
              <PieChart>
                <Pie data={usersByRole} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={75} innerRadius={45}
                  paddingAngle={3} animationDuration={600}>
                  {usersByRole.map((_: any, i: number) => (
                    <Cell key={i} fill={[CHART_COLORS.primary, CHART_COLORS.purple, CHART_COLORS.blue][i] ?? CHART_COLORS.yellow}/>
                  ))}
                </Pie>
                <Tooltip contentStyle={{ background: '#0F2040', border: '1px solid #1E3A6A', borderRadius: 12, fontSize: 12 }}/>
                <Legend wrapperStyle={{ fontSize: 11 }}/>
              </PieChart>
            </ResponsiveContainer>
          ) : <EmptyChart loading={isLoading}/>}
        </div>

        {/* Commandes par jour / heure */}
        <div className="xl:col-span-3 card p-5">
          <ChartHeader
            title={period === 'day' ? "Commandes par heure" : "Commandes par jour"}
            subtitle={periodLabel}/>
          {chartData.length > 0 ? (
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={chartData} margin={{ top: 5, right: 5, bottom: 0, left: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1E3A6A" vertical={false}/>
                <XAxis dataKey="day" tick={{ fill: '#64748B', fontSize: 11, fontWeight: 600 }} axisLine={false} tickLine={false}/>
                <YAxis tick={{ fill: '#64748B', fontSize: 11 }} axisLine={false} tickLine={false} allowDecimals={false}/>
                <Tooltip content={<CustomTooltip/>}/>
                <Bar dataKey="orders" fill={CHART_COLORS.yellow} radius={[6, 6, 0, 0]} name="orders" animationDuration={600}/>
              </BarChart>
            </ResponsiveContainer>
          ) : <EmptyChart loading={isLoading}/>}
        </div>
      </div>

      {/* ═══ Bloc 4 — Classements (4 cards top 5) ═══════════════════════════ */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <RankCard
          title="Top 5 pays" subtitle="Par commandes livrées"
          icon={Globe} accent="brand-green"
          items={topCountries.map((c: any) => ({
            label: COUNTRIES.find(x => x.code === c.country)?.name ?? c.country,
            value: `${c.ordersCount} cmd`,
            sub: formatCFA(c.revenue),
          }))}
          loading={isLoading}
        />
        <RankCard
          title="Top 5 clients" subtitle="Par nombre de commandes"
          icon={UserIcon} accent="blue"
          items={topClients.map((c: any) => ({
            label: c.name,
            value: `${c.ordersCount} cmd`,
            sub: formatCFA(c.totalSpent),
          }))}
          loading={isLoading}
        />
        <RankCard
          title="Top 5 livreurs" subtitle="Par livraisons effectuées"
          icon={Truck} accent="teal"
          items={topDrivers.map((d: any) => ({
            label: d.name,
            value: `${d.deliveriesCount} liv.`,
            sub: d.phone ?? '',
          }))}
          loading={isLoading}
        />
        <RankCard
          title="Top 5 professionnels" subtitle="Par commandes livrées"
          icon={Briefcase} accent="purple"
          items={topPros.map((p: any) => ({
            label: p.businessName,
            value: `${p.ordersCount} cmd`,
            sub: `${formatCFA(p.revenue)}${p.city ? ' · ' + p.city : ''}`,
          }))}
          loading={isLoading}
        />
      </div>

      {/* ═══ Live orders ═════════════════════════════════════════════════════ */}
      <div className="card p-5">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-green-400 animate-pulse"/>
            <h3 className="text-base font-black text-slate-100">Commandes en temps réel</h3>
          </div>
          <span className="text-xs text-slate-500 font-semibold">Actualisation auto 15 s</span>
        </div>
        <div className="space-y-2">
          {liveLoading ? (
            Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="h-12 bg-navy-800 rounded-xl animate-pulse"/>
            ))
          ) : liveOrders.length === 0 ? (
            <p className="text-sm text-slate-500 text-center py-8 font-semibold">Aucune commande active en ce moment</p>
          ) : (
            liveOrders.map((order: any) => (
              <div key={order.id} className="flex items-center gap-3 py-3 border-b border-navy-700 last:border-0">
                <span className="text-xs font-black text-slate-500 w-16">#{order.id?.substring(0,6).toUpperCase()}</span>
                <span className="text-sm font-semibold text-slate-300 flex-1 truncate">{order.client?.name || '—'}</span>
                <span className="text-xs text-slate-500 hidden sm:block">{order.professional?.businessName || '—'}</span>
                <Badge status={order.status}/>
                <span className="text-sm font-black text-brand-green w-20 text-right">{formatCFA(order.totalAmount)}</span>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  )
}

// ─── Sous-composants ─────────────────────────────────────────────────────────

const ChartHeader: React.FC<{ title: string; subtitle: string }> = ({ title, subtitle }) => (
  <div className="mb-5">
    <h3 className="text-base font-black text-slate-100">{title}</h3>
    <p className="text-xs text-slate-500 font-semibold">{subtitle}</p>
  </div>
)

const EmptyChart: React.FC<{ loading?: boolean }> = ({ loading }) => (
  <div className="h-[240px] flex items-center justify-center text-slate-500 text-sm font-semibold">
    {loading ? <span className="animate-pulse">Chargement…</span> : 'Aucune donnée pour cette période'}
  </div>
)

interface RankItem { label: string; value: string; sub?: string }

const RANK_ACCENT: Record<string, string> = {
  'brand-green': 'bg-brand-green/10 text-brand-green border-brand-green/30',
  'blue':        'bg-blue-500/10 text-blue-400 border-blue-500/30',
  'teal':        'bg-teal-500/10 text-teal-400 border-teal-500/30',
  'purple':      'bg-purple-500/10 text-purple-400 border-purple-500/30',
}

const RankCard: React.FC<{
  title: string; subtitle: string; icon: any; accent: string;
  items: RankItem[]; loading?: boolean
}> = ({ title, subtitle, icon: Icon, accent, items, loading }) => {
  const acc = RANK_ACCENT[accent] ?? RANK_ACCENT['brand-green']
  return (
    <div className="card p-5">
      <div className="flex items-center gap-3 mb-4">
        <div className={`w-9 h-9 rounded-xl border flex items-center justify-center ${acc}`}>
          <Icon size={16}/>
        </div>
        <div>
          <h3 className="text-sm font-black text-slate-100 leading-tight">{title}</h3>
          <p className="text-xs text-slate-500 font-semibold">{subtitle}</p>
        </div>
      </div>
      {loading ? (
        <div className="space-y-2">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="h-10 bg-navy-800 rounded-lg animate-pulse"/>
          ))}
        </div>
      ) : items.length === 0 ? (
        <p className="text-center py-6 text-sm text-slate-500 font-semibold">Aucune donnée</p>
      ) : (
        <ol className="space-y-1.5">
          {items.map((item, i) => (
            <li key={i} className="flex items-center gap-3 py-2 px-2 rounded-lg hover:bg-navy-700/40 transition-colors">
              <span className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-black ${i === 0 ? 'bg-brand-yellow/20 text-brand-yellow' : 'bg-navy-700 text-slate-400'}`}>
                {i === 0 ? <Trophy size={11}/> : i + 1}
              </span>
              <div className="flex-1 min-w-0">
                <div className="text-sm font-semibold text-slate-200 truncate">{item.label}</div>
                {item.sub && <div className="text-xs text-slate-500 truncate">{item.sub}</div>}
              </div>
              <span className="text-xs font-black text-slate-300 flex-shrink-0">{item.value}</span>
            </li>
          ))}
        </ol>
      )}
    </div>
  )
}
