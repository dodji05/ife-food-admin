import React from 'react'
import { LucideIcon, TrendingUp, TrendingDown } from 'lucide-react'

interface Props {
  title: string; value: string | number; sub?: string
  icon: LucideIcon; color?: string; trend?: number; loading?: boolean
}

export const StatCard: React.FC<Props> = ({ title, value, sub, icon: Icon, color = 'brand-green', trend, loading }) => {
  const colorMap: Record<string, { bg: string; text: string; border: string }> = {
    'brand-green': { bg: 'bg-brand-green/10', text: 'text-brand-green', border: 'border-brand-green/20' },
    'yellow': { bg: 'bg-yellow-500/10', text: 'text-yellow-400', border: 'border-yellow-500/20' },
    'blue': { bg: 'bg-blue-500/10', text: 'text-blue-400', border: 'border-blue-500/20' },
    'purple': { bg: 'bg-purple-500/10', text: 'text-purple-400', border: 'border-purple-500/20' },
    'red': { bg: 'bg-red-500/10', text: 'text-red-400', border: 'border-red-500/20' },
    'teal': { bg: 'bg-teal-500/10', text: 'text-teal-400', border: 'border-teal-500/20' },
  }
  const c = colorMap[color] || colorMap['brand-green']

  return (
    <div className="card p-5 flex flex-col gap-4">
      <div className="flex items-start justify-between">
        <div className={`w-11 h-11 rounded-xl ${c.bg} border ${c.border} flex items-center justify-center`}>
          <Icon size={20} className={c.text}/>
        </div>
        {trend !== undefined && (
          <span className={`flex items-center gap-1 text-xs font-bold ${trend >= 0 ? 'text-green-400' : 'text-red-400'}`}>
            {trend >= 0 ? <TrendingUp size={12}/> : <TrendingDown size={12}/>}
            {Math.abs(trend)}%
          </span>
        )}
      </div>
      {loading ? (
        <div className="space-y-2">
          <div className="h-7 bg-navy-700 rounded animate-pulse w-24"/>
          <div className="h-4 bg-navy-700 rounded animate-pulse w-32"/>
        </div>
      ) : (
        <div>
          <div className="text-2xl font-black text-slate-100">{value}</div>
          <div className="text-sm text-slate-400 font-semibold mt-0.5">{title}</div>
          {sub && <div className="text-xs text-slate-500 mt-1">{sub}</div>}
        </div>
      )}
    </div>
  )
}
