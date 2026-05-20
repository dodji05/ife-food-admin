import React, { useState, useEffect } from 'react'
import { Search, ChevronLeft, ChevronRight } from 'lucide-react'

interface Column<T> { key: string; label: string; render?: (row: T) => React.ReactNode; width?: string }
interface Props<T> { columns: Column<T>[]; data: T[]; loading?: boolean; pageSize?: number; searchable?: boolean; onRowClick?: (row: T) => void }

const SEARCHABLE_KEYS = new Set(['id','name','firstName','phone','email','businessName','status','vehicleType','zoneCity','code','title'])

export function DataTable<T extends { id?: string }>({ columns, data, loading, pageSize = 15, searchable = true, onRowClick }: Props<T>) {
  const [query, setQuery] = useState('')
  const [page, setPage] = useState(0)

  // Réinitialise la page quand le nombre de lignes change (filtre, changement de source)
  // mais PAS à chaque refetch React Query (nouvelle référence tableau, même contenu).
  useEffect(() => { setPage(0) }, [data.length])

  const filtered = query
    ? data.filter(row =>
        columns.some(col => {
          const val = (row as any)[col.key]
          if (val == null) return false
          if (typeof val === 'object') return false
          return String(val).toLowerCase().includes(query.toLowerCase())
        }) ||
        Object.entries(row as any).some(([k, v]) =>
          SEARCHABLE_KEYS.has(k) && typeof v === 'string' && v.toLowerCase().includes(query.toLowerCase())
        )
      )
    : data
  const totalPages = Math.ceil(filtered.length / pageSize)
  const paged = filtered.slice(page * pageSize, (page + 1) * pageSize)

  return (
    <div className="flex flex-col gap-4">
      {searchable && (
        <div className="relative">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500"/>
          <input value={query} onChange={e => { setQuery(e.target.value); setPage(0) }}
            placeholder="Rechercher dans le tableau…" className="input pl-9 h-9 text-sm w-full max-w-sm"/>
        </div>
      )}
      <div className="overflow-x-auto rounded-xl border border-navy-700">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-navy-800 border-b border-navy-700">
              {columns.map(col => (
                <th key={col.key} style={{ width: col.width }} className="text-left px-4 py-3 text-xs font-bold text-slate-400 uppercase tracking-wider whitespace-nowrap">
                  {col.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <tr key={i} className="border-b border-navy-800">
                  {columns.map(col => (
                    <td key={col.key} className="px-4 py-3">
                      <div className="h-4 bg-navy-700 rounded animate-pulse w-3/4"/>
                    </td>
                  ))}
                </tr>
              ))
            ) : paged.length === 0 ? (
              <tr><td colSpan={columns.length} className="px-4 py-12 text-center text-slate-500 font-semibold">Aucune donnée</td></tr>
            ) : (
              paged.map((row, i) => (
                <tr key={(row as any).id || i} onClick={() => onRowClick?.(row)}
                  className={`border-b border-navy-800 transition-colors ${onRowClick ? 'cursor-pointer hover:bg-navy-800/60' : ''}`}>
                  {columns.map(col => (
                    <td key={col.key} className="px-4 py-3 text-slate-300 font-medium">
                      {col.render ? col.render(row) : String((row as any)[col.key] ?? '—')}
                    </td>
                  ))}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <span className="text-xs text-slate-500 font-semibold">{filtered.length} résultat{filtered.length !== 1 ? 's' : ''}</span>
          <div className="flex items-center gap-2">
            <button onClick={() => setPage(p => Math.max(0, p - 1))} disabled={page === 0} className="p-1.5 text-slate-400 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed hover:bg-navy-700 rounded-lg transition-colors">
              <ChevronLeft size={16}/>
            </button>
            <span className="text-xs font-bold text-slate-300">{page + 1} / {totalPages}</span>
            <button onClick={() => setPage(p => Math.min(totalPages - 1, p + 1))} disabled={page >= totalPages - 1} className="p-1.5 text-slate-400 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed hover:bg-navy-700 rounded-lg transition-colors">
              <ChevronRight size={16}/>
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
