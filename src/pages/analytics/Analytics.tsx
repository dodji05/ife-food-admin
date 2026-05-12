import React from 'react'
import { useQuery } from '@tanstack/react-query'
import api from '../../services/api'
import { StatCard } from '../../components/ui/StatCard'
import { formatCFA } from '../../utils/format'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, CartesianGrid, Legend } from 'recharts'
import { TrendingUp, Users, Package, Truck } from 'lucide-react'

const COLORS = ['#1A6B3C','#F5C518','#3B82F6','#8B5CF6','#EF4444']

const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload?.length) return (
    <div className="bg-navy-800 border border-navy-600 rounded-xl p-3 shadow-xl">
      <p className="text-xs font-bold text-slate-400 mb-1">{label}</p>
      {payload.map((p: any) => <p key={p.name} style={{ color: p.color }} className="text-sm font-bold">{p.name === 'revenue' ? formatCFA(p.value) : p.value}</p>)}
    </div>
  )
  return null
}

export const Analytics: React.FC = () => {
  const { data, isLoading } = useQuery({
    queryKey: ['analytics'],
    queryFn: () => api.get('/admin/analytics').then((r: any) => r.data),
  })

  const countryData: any[] = data?.byCountry ?? []
  const categoryData: any[] = data?.byCategory ?? []
  const funnel: any[] = data?.funnel ?? []

  return (
  <div className="space-y-6">
    <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
      <StatCard title="Taux de complétion" value={data?.completionRate ? `${data.completionRate}%` : '—'} icon={TrendingUp} color="brand-green" trend={2} loading={isLoading}/>
      <StatCard title="Panier moyen" value={data?.avgBasket ? formatCFA(data.avgBasket) : '—'} icon={Package} color="yellow" trend={5} loading={isLoading}/>
      <StatCard title="Temps livraison moyen" value={data?.avgDeliveryMin ? `${data.avgDeliveryMin} min` : '—'} icon={Truck} color="blue" loading={isLoading}/>
      <StatCard title="Taux de rétention" value={data?.retentionRate ? `${data.retentionRate}%` : '—'} icon={Users} color="purple" trend={3} loading={isLoading}/>
    </div>

    <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
      <div className="xl:col-span-2 card p-5">
        <h3 className="text-base font-black text-slate-100 mb-1">Revenus par pays</h3>
        <p className="text-xs text-slate-500 mb-5 font-semibold">Ce mois</p>
        {countryData.length > 0 ? (
          <ResponsiveContainer width="100%" height={240}>
            <BarChart data={countryData} layout="vertical" margin={{ left: 10, right: 20 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#1E3A6A" horizontal={false}/>
              <XAxis type="number" tick={{ fill: '#64748B', fontSize: 11 }} axisLine={false} tickLine={false} tickFormatter={v => `${v/1000}k`}/>
              <YAxis type="category" dataKey="name" tick={{ fill: '#94A3B8', fontSize: 12, fontWeight: 600 }} axisLine={false} tickLine={false} width={80}/>
              <Tooltip content={<CustomTooltip/>}/>
              <Bar dataKey="revenue" fill="#1A6B3C" radius={[0,6,6,0]} name="revenue"/>
            </BarChart>
          </ResponsiveContainer>
        ) : (
          <div className="h-[240px] flex items-center justify-center text-slate-500 text-sm font-semibold">
            {isLoading ? <span className="animate-pulse">Chargement…</span> : 'Aucune donnée disponible'}
          </div>
        )}
      </div>

      <div className="card p-5">
        <h3 className="text-base font-black text-slate-100 mb-1">Répartition par catégorie</h3>
        <p className="text-xs text-slate-500 mb-5 font-semibold">% des commandes</p>
        {categoryData.length > 0 ? (
          <ResponsiveContainer width="100%" height={200}>
            <PieChart>
              <Pie data={categoryData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80} strokeWidth={2} stroke="#0A1628">
                {categoryData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]}/>)}
              </Pie>
              <Tooltip formatter={(v: any) => [`${v}%`]}/>
              <Legend iconSize={8} iconType="circle" formatter={(v) => <span className="text-xs font-semibold text-slate-400">{v}</span>}/>
            </PieChart>
          </ResponsiveContainer>
        ) : (
          <div className="h-[200px] flex items-center justify-center text-slate-500 text-sm font-semibold">
            {isLoading ? <span className="animate-pulse">Chargement…</span> : 'Aucune donnée'}
          </div>
        )}
      </div>
    </div>

    {funnel.length > 0 && (
      <div className="card p-5">
        <h3 className="text-base font-black text-slate-100 mb-1">Entonnoir de conversion</h3>
        <p className="text-xs text-slate-500 mb-5 font-semibold">Inscription → Première commande → Client fidèle</p>
        <div className="flex gap-4 items-end h-32">
          {funnel.map((item: any) => (
            <div key={item.label} className="flex-1 flex flex-col items-center gap-2">
              <span className="text-xs font-black text-slate-300">{Number(item.value).toLocaleString('fr-FR')}</span>
              <div className={`w-full ${item.color} rounded-t-lg transition-all`} style={{ height: `${item.pct}%` }}/>
              <span className="text-[10px] font-bold text-slate-500 text-center">{item.label}</span>
            </div>
          ))}
        </div>
      </div>
    )}
  </div>
  )
}
