import React from 'react'
import { useQuery } from '@tanstack/react-query'
import api from '../../services/api'
import { StatCard } from '../../components/ui/StatCard'
import { Badge } from '../../components/ui/Badge'
import { formatCFA } from '../../utils/format'
import { useFiltersStore } from '../../store/filters'
import { ShoppingCart, Users, Briefcase, Truck, TrendingUp, Clock, Star, AlertCircle } from 'lucide-react'
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, BarChart, Bar, CartesianGrid } from 'recharts'

const CHART_COLORS = { primary: '#1A6B3C', yellow: '#F5C518', blue: '#3B82F6', purple: '#8B5CF6' }

const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload?.length) return (
    <div className="bg-navy-800 border border-navy-600 rounded-xl p-3 shadow-xl">
      <p className="text-xs font-bold text-slate-400 mb-1">{label}</p>
      {payload.map((p: any) => (
        <p key={p.name} className="text-sm font-bold" style={{ color: p.color }}>
          {p.name === 'revenue' ? formatCFA(p.value) : `${p.value} commandes`}
        </p>
      ))}
    </div>
  )
  return null
}

export const Dashboard: React.FC = () => {
  const { period, country } = useFiltersStore()

  const params = new URLSearchParams({ period, ...(country ? { country } : {}) })
  const { data: stats, isLoading } = useQuery({
    queryKey: ['dashboard', period, country],
    queryFn: () => api.get(`/admin/dashboard?${params}`).then((r: any) => r.data),
    refetchInterval: 30000,
  })

  const { data: liveOrders = [], isLoading: liveLoading } = useQuery({
    queryKey: ['live-orders'],
    queryFn: () => api.get('/admin/orders?status=PAID,IN_PREPARATION,IN_DELIVERY&limit=5').then((r: any) => r?.data?.data ?? r?.data ?? []),
    refetchInterval: 15000,
  })

  const revenueData: any[] = stats?.chartData ?? []

  const pct = (cur: number, prev: number) => prev > 0 ? Math.round((cur - prev) / prev * 100) : undefined
  const ordersTrend = pct(stats?.orders?.count ?? 0, stats?.prev?.orders?.count ?? 0)
  const revenueTrend = pct(stats?.orders?.revenue ?? 0, stats?.prev?.orders?.revenue ?? 0)
  const commissionsTrend = pct(stats?.commissions ?? 0, stats?.prev?.commissions ?? 0)
  const usersTrend = pct(stats?.newUsers ?? 0, stats?.prev?.newUsers ?? 0)

  const periodLabel = period === 'day' ? "Aujourd'hui" : period === 'month' ? '30 derniers jours' : '7 derniers jours'

  return (
    <div className="space-y-6">
      {/* KPI Grid */}
      <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
        <StatCard title={`Commandes — ${periodLabel}`} value={stats?.orders?.count ?? '—'} sub="vs. période précédente" icon={ShoppingCart} color="brand-green" trend={ordersTrend} loading={isLoading}/>
        <StatCard title="Chiffre d'affaires" value={isLoading ? '—' : formatCFA(stats?.orders?.revenue ?? 0)} icon={TrendingUp} color="yellow" trend={revenueTrend} loading={isLoading}/>
        <StatCard title="Commissions perçues" value={isLoading ? '—' : formatCFA(stats?.commissions ?? 0)} icon={AlertCircle} color="purple" trend={commissionsTrend} loading={isLoading}/>
        <StatCard title="Nouveaux clients" value={stats?.newUsers ?? '—'} icon={Users} color="blue" trend={usersTrend} loading={isLoading}/>
      </div>

      <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
        <StatCard title="Professionnels actifs" value={stats?.newProfessionals ?? '—'} icon={Briefcase} color="teal" loading={isLoading}/>
        <StatCard title="Livreurs actifs" value={stats?.activeDeliveries ?? '—'} icon={Truck} color="brand-green" loading={isLoading}/>
        <StatCard title="Note moyenne" value={stats?.avgRating ? `${Number(stats.avgRating).toFixed(1)} ⭐` : '—'} icon={Star} color="yellow" loading={isLoading}/>
        <StatCard title="Taux d'annulation" value={stats?.cancelRate ? `${stats.cancelRate}%` : '—'} icon={Clock} color="red" loading={isLoading}/>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        {/* Revenue chart */}
        <div className="xl:col-span-2 card p-5">
          <div className="flex items-center justify-between mb-5">
            <div>
              <h3 className="text-base font-black text-slate-100">Revenus & Commandes</h3>
              <p className="text-xs text-slate-500 font-semibold">
                {period === 'day' ? "Aujourd'hui" : period === 'month' ? '30 derniers jours' : '7 derniers jours'}
              </p>
            </div>
          </div>
          {revenueData.length > 0 ? (
            <ResponsiveContainer width="100%" height={220}>
              <AreaChart data={revenueData} margin={{ top: 5, right: 5, bottom: 0, left: 0 }}>
                <defs>
                  <linearGradient id="gRevenue" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor={CHART_COLORS.primary} stopOpacity={0.25}/>
                    <stop offset="95%" stopColor={CHART_COLORS.primary} stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#1E3A6A" vertical={false}/>
                <XAxis dataKey="day" tick={{ fill: '#64748B', fontSize: 12, fontWeight: 600 }} axisLine={false} tickLine={false}/>
                <YAxis tick={{ fill: '#64748B', fontSize: 11 }} axisLine={false} tickLine={false} tickFormatter={v => `${v/1000}k`}/>
                <Tooltip content={<CustomTooltip/>}/>
                <Area type="monotone" dataKey="revenue" stroke={CHART_COLORS.primary} strokeWidth={2.5} fill="url(#gRevenue)" name="revenue"/>
              </AreaChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-[220px] flex items-center justify-center text-slate-500 text-sm font-semibold">
              {isLoading ? <span className="animate-pulse">Chargement…</span> : 'Aucune donnée pour cette période'}
            </div>
          )}
        </div>

        {/* Orders by day */}
        <div className="card p-5">
          <h3 className="text-base font-black text-slate-100 mb-1">Commandes / jour</h3>
          <p className="text-xs text-slate-500 font-semibold mb-5">
            {period === 'day' ? "Aujourd'hui" : period === 'month' ? '30 derniers jours' : '7 derniers jours'}
          </p>
          {revenueData.length > 0 ? (
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={revenueData} margin={{ top: 5, right: 5, bottom: 0, left: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1E3A6A" vertical={false}/>
                <XAxis dataKey="day" tick={{ fill: '#64748B', fontSize: 12, fontWeight: 600 }} axisLine={false} tickLine={false}/>
                <YAxis tick={{ fill: '#64748B', fontSize: 11 }} axisLine={false} tickLine={false}/>
                <Tooltip content={<CustomTooltip/>}/>
                <Bar dataKey="orders" fill={CHART_COLORS.yellow} radius={[6,6,0,0]} name="orders"/>
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-[220px] flex items-center justify-center text-slate-500 text-sm font-semibold">
              {isLoading ? <span className="animate-pulse">Chargement…</span> : 'Aucune donnée'}
            </div>
          )}
        </div>
      </div>

      {/* Live orders preview */}
      <div className="card p-5">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-green-400 animate-pulse"/>
            <h3 className="text-base font-black text-slate-100">Commandes en temps réel</h3>
          </div>
          <span className="text-xs text-slate-500 font-semibold">Actualisation auto 15s</span>
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
                <span className="text-sm font-semibold text-slate-300 flex-1">{order.client?.name || '—'}</span>
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
