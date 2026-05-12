import React from 'react'
import { statusColor, statusLabel } from '../../utils/format'

interface Props { status: string; label?: string; size?: 'sm' | 'md' }

export const Badge: React.FC<Props> = ({ status, label, size = 'md' }) => {
  const color = statusColor(status)
  const colorMap: Record<string, string> = {
    green:  'bg-green-500/15 text-green-400 border-green-500/30',
    yellow: 'bg-yellow-500/15 text-yellow-400 border-yellow-500/30',
    red:    'bg-red-500/15 text-red-400 border-red-500/30',
    blue:   'bg-blue-500/15 text-blue-400 border-blue-500/30',
    gray:   'bg-slate-500/15 text-slate-400 border-slate-500/30',
  }
  return (
    <span className={`inline-flex items-center rounded-full font-bold border ${colorMap[color] || colorMap.gray} ${size === 'sm' ? 'px-2 py-0.5 text-[10px]' : 'px-2.5 py-0.5 text-xs'}`}>
      {label || statusLabel(status)}
    </span>
  )
}
