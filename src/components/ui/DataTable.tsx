import React, { useState, useEffect, useMemo, useRef } from 'react'
import {
  Search, ChevronLeft, ChevronRight, ArrowUpDown, ArrowUp, ArrowDown,
  Download, ChevronDown, FileText, FileSpreadsheet, File,
} from 'lucide-react'

interface Column<T> {
  key: string
  label: string
  render?: (row: T) => React.ReactNode
  width?: string
  /** Active le tri par clic sur le header. */
  sortable?: boolean
  /** Extracteur de valeur de tri custom. Fallback : row[key]. */
  sortValue?: (row: T) => string | number | Date | null | undefined
  /** Extracteur de valeur pour l'export (CSV, Excel, PDF). Fallback : row[key]. */
  exportValue?: (row: T) => string | number | Date | null | undefined
  /** Cache la colonne en dessous de sm (640px). */
  hideOnMobile?: boolean
}

interface Props<T> {
  columns: Column<T>[]
  data: T[]
  loading?: boolean
  pageSize?: number
  searchable?: boolean
  onRowClick?: (row: T) => void
  /** Filtres custom rendus à gauche de la search bar. */
  toolbar?: React.ReactNode
  /** Affiche le bouton "Exporter" (menu déroulant : CSV / Excel / PDF). */
  exportable?: boolean
  /** Nom de fichier (sans extension ni date). Défaut: "export". */
  exportFilename?: string
  /** Message affiché quand le tableau est vide. */
  emptyMessage?: string
}

type ExportFormat = 'csv' | 'xlsx' | 'pdf'

const SEARCHABLE_KEYS = new Set(['id','name','firstName','phone','email','businessName','status','vehicleType','zoneCity','code','title'])

type SortState = { key: string; dir: 'asc' | 'desc' } | null

function compareValues(a: any, b: any): number {
  if (a == null && b == null) return 0
  if (a == null) return 1
  if (b == null) return -1
  if (a instanceof Date && b instanceof Date) return a.getTime() - b.getTime()
  if (typeof a === 'number' && typeof b === 'number') return a - b
  return String(a).localeCompare(String(b), 'fr', { numeric: true })
}

function escapeCsv(v: any): string {
  if (v == null) return ''
  const s = v instanceof Date ? v.toISOString() : String(v)
  if (/[",\n;]/.test(s)) return `"${s.replace(/"/g, '""')}"`
  return s
}

/** Prépare les données d'export : enlève les colonnes sans label (actions), extrait les valeurs. */
function buildExportRows<T>(rows: T[], columns: Column<T>[]) {
  const cols = columns.filter(c => c.label && c.label.trim() !== '')
  const headers = cols.map(c => c.label)
  const data = rows.map(row =>
    cols.map(col => {
      const raw = col.exportValue ? col.exportValue(row) : (row as any)[col.key]
      return raw ?? ''
    })
  )
  return { headers, data }
}

function triggerDownload(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  document.body.appendChild(link)
  link.click()
  link.remove()
  URL.revokeObjectURL(url)
}

function exportCsv(headers: string[], data: any[][], filename: string) {
  const headerLine = headers.map(escapeCsv).join(',')
  const lines = data.map(row => row.map(escapeCsv).join(','))
  // BOM UTF-8 pour qu'Excel détecte l'encodage
  const csv = '﻿' + [headerLine, ...lines].join('\n')
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
  triggerDownload(blob, `${filename}.csv`)
}

async function exportXlsx(headers: string[], data: any[][], filename: string) {
  // Dynamic import pour éviter d'alourdir le bundle initial (~440KB).
  const XLSX = await import('xlsx')
  const ws = XLSX.utils.aoa_to_sheet([headers, ...data])
  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, ws, 'Données')
  XLSX.writeFile(wb, `${filename}.xlsx`)
}

async function exportPdf(headers: string[], data: any[][], filename: string, title: string) {
  // Dynamic import — jspdf + autotable pèsent ~250KB combinés.
  const jsPDFModule = await import('jspdf')
  const autoTableModule = await import('jspdf-autotable')
  const jsPDF = jsPDFModule.default
  const autoTable = autoTableModule.default

  const doc = new jsPDF({ orientation: 'landscape', unit: 'pt', format: 'a4' })

  // Titre
  doc.setFontSize(14)
  doc.setFont('helvetica', 'bold')
  doc.text(title, 40, 32)
  doc.setFontSize(9)
  doc.setFont('helvetica', 'normal')
  doc.setTextColor(120)
  doc.text(new Date().toLocaleDateString('fr-FR', { dateStyle: 'long' }), 40, 48)

  autoTable(doc, {
    head: [headers],
    body: data.map(row => row.map(cell => {
      if (cell == null) return ''
      if (cell instanceof Date) return cell.toLocaleDateString('fr-FR')
      return String(cell)
    })),
    startY: 60,
    margin: { left: 40, right: 40 },
    styles: { fontSize: 8.5, cellPadding: 5 },
    headStyles: { fillColor: [26, 107, 60], textColor: 255, fontStyle: 'bold' },
    alternateRowStyles: { fillColor: [245, 247, 245] },
    columnStyles: {},
  })

  doc.save(`${filename}.pdf`)
}

export function DataTable<T extends { id?: string }>({
  columns,
  data,
  loading,
  pageSize = 15,
  searchable = true,
  onRowClick,
  toolbar,
  exportable,
  exportFilename = 'export',
  emptyMessage = 'Aucune donnée',
}: Props<T>) {
  const [query, setQuery] = useState('')
  const [page, setPage] = useState(0)
  const [sort, setSort] = useState<SortState>(null)
  const [exportMenuOpen, setExportMenuOpen] = useState(false)
  const [exporting, setExporting] = useState<ExportFormat | null>(null)
  const exportMenuRef = useRef<HTMLDivElement>(null)

  useEffect(() => { setPage(0) }, [data.length])

  // Fermeture du menu export au clic extérieur ou à la touche Échap.
  useEffect(() => {
    if (!exportMenuOpen) return
    const onClick = (e: MouseEvent) => {
      if (exportMenuRef.current && !exportMenuRef.current.contains(e.target as Node)) {
        setExportMenuOpen(false)
      }
    }
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setExportMenuOpen(false) }
    document.addEventListener('mousedown', onClick)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', onClick)
      document.removeEventListener('keydown', onKey)
    }
  }, [exportMenuOpen])

  const filtered = useMemo(() => {
    if (!query) return data
    const q = query.toLowerCase()
    return data.filter(row =>
      columns.some(col => {
        const val = (row as any)[col.key]
        if (val == null) return false
        if (typeof val === 'object') return false
        return String(val).toLowerCase().includes(q)
      }) ||
      Object.entries(row as any).some(([k, v]) =>
        SEARCHABLE_KEYS.has(k) && typeof v === 'string' && v.toLowerCase().includes(q)
      )
    )
  }, [data, query, columns])

  const sorted = useMemo(() => {
    if (!sort) return filtered
    const col = columns.find(c => c.key === sort.key)
    if (!col) return filtered
    const get = col.sortValue ?? ((r: T) => (r as any)[sort.key])
    const arr = [...filtered].sort((a, b) => compareValues(get(a), get(b)))
    if (sort.dir === 'desc') arr.reverse()
    return arr
  }, [filtered, sort, columns])

  const totalPages = Math.max(1, Math.ceil(sorted.length / pageSize))
  const paged = sorted.slice(page * pageSize, (page + 1) * pageSize)

  const handleSort = (key: string) => {
    setSort(s => {
      if (!s || s.key !== key) return { key, dir: 'asc' }
      if (s.dir === 'asc') return { key, dir: 'desc' }
      return null
    })
    setPage(0)
  }

  const handleExport = async (format: ExportFormat) => {
    setExportMenuOpen(false)
    setExporting(format)
    try {
      const { headers, data: exportData } = buildExportRows(sorted, columns)
      const today = new Date().toISOString().slice(0, 10)
      const fname = `${exportFilename}-${today}`
      if (format === 'csv') exportCsv(headers, exportData, fname)
      else if (format === 'xlsx') await exportXlsx(headers, exportData, fname)
      else if (format === 'pdf') await exportPdf(headers, exportData, fname, exportFilename)
    } catch (e) {
      console.error('[Export]', e)
    } finally {
      setExporting(null)
    }
  }

  const hasToolbar = !!toolbar || searchable || exportable
  const exportDisabled = loading || sorted.length === 0 || !!exporting

  return (
    <div className="flex flex-col gap-4">
      {hasToolbar && (
        <div className="flex items-center gap-2 flex-wrap">
          {toolbar && <div className="flex items-center gap-2 flex-wrap">{toolbar}</div>}
          {searchable && (
            <div className="relative flex-1 min-w-[160px] max-w-sm">
              <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500"/>
              <input
                value={query}
                onChange={e => { setQuery(e.target.value); setPage(0) }}
                placeholder="Rechercher…"
                className="input pl-9 h-9 text-sm w-full"
              />
            </div>
          )}
          {exportable && (
            <div className="relative" ref={exportMenuRef}>
              <button
                onClick={() => setExportMenuOpen(o => !o)}
                disabled={exportDisabled}
                className="btn-secondary text-xs h-9 disabled:opacity-40 disabled:cursor-not-allowed"
                title="Exporter"
                aria-haspopup="menu"
                aria-expanded={exportMenuOpen}
              >
                <Download size={14}/>
                <span>{exporting ? 'Export…' : 'Exporter'}</span>
                <ChevronDown size={12} className={`transition-transform ${exportMenuOpen ? 'rotate-180' : ''}`}/>
              </button>
              {exportMenuOpen && (
                <div
                  role="menu"
                  className="absolute right-0 top-full mt-1 z-30 bg-navy-800 border border-navy-600 rounded-xl overflow-hidden shadow-xl min-w-[140px]"
                >
                  <button
                    role="menuitem"
                    onClick={() => handleExport('csv')}
                    className="flex items-center gap-2 w-full px-3 py-2.5 text-xs font-semibold text-slate-300 hover:bg-navy-700 transition-colors"
                  >
                    <FileText size={13} className="text-slate-400"/> CSV
                  </button>
                  <button
                    role="menuitem"
                    onClick={() => handleExport('xlsx')}
                    className="flex items-center gap-2 w-full px-3 py-2.5 text-xs font-semibold text-slate-300 hover:bg-navy-700 transition-colors border-t border-navy-700"
                  >
                    <FileSpreadsheet size={13} className="text-green-400"/> Excel
                  </button>
                  <button
                    role="menuitem"
                    onClick={() => handleExport('pdf')}
                    className="flex items-center gap-2 w-full px-3 py-2.5 text-xs font-semibold text-slate-300 hover:bg-navy-700 transition-colors border-t border-navy-700"
                  >
                    <File size={13} className="text-red-400"/> PDF
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      <div className="overflow-x-auto rounded-xl border border-navy-700">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-navy-800 border-b border-navy-700">
              {columns.map(col => {
                const isSorted = sort?.key === col.key
                const isSortable = !!col.sortable
                return (
                  <th
                    key={col.key}
                    style={{ width: col.width }}
                    onClick={isSortable ? () => handleSort(col.key) : undefined}
                    className={`text-left px-4 py-3 text-xs font-bold text-slate-400 uppercase tracking-wider whitespace-nowrap
                      ${isSortable ? 'cursor-pointer hover:text-slate-200 select-none transition-colors' : ''}
                      ${col.hideOnMobile ? 'hidden sm:table-cell' : ''}`}
                  >
                    <span className="inline-flex items-center gap-1">
                      {col.label}
                      {isSortable && (
                        isSorted
                          ? (sort?.dir === 'asc' ? <ArrowUp size={12}/> : <ArrowDown size={12}/>)
                          : <ArrowUpDown size={12} className="opacity-40"/>
                      )}
                    </span>
                  </th>
                )
              })}
            </tr>
          </thead>
          <tbody>
            {loading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <tr key={i} className="border-b border-navy-800">
                  {columns.map(col => (
                    <td key={col.key} className={`px-4 py-3 ${col.hideOnMobile ? 'hidden sm:table-cell' : ''}`}>
                      <div className="h-4 bg-navy-700 rounded animate-pulse w-3/4"/>
                    </td>
                  ))}
                </tr>
              ))
            ) : paged.length === 0 ? (
              <tr><td colSpan={columns.length} className="px-4 py-12 text-center text-slate-500 font-semibold">{emptyMessage}</td></tr>
            ) : (
              paged.map((row, i) => (
                <tr
                  key={(row as any).id || i}
                  onClick={() => onRowClick?.(row)}
                  className={`border-b border-navy-800 transition-colors ${onRowClick ? 'cursor-pointer hover:bg-navy-800/60' : ''}`}
                >
                  {columns.map(col => (
                    <td key={col.key} className={`px-4 py-3 text-slate-300 font-medium ${col.hideOnMobile ? 'hidden sm:table-cell' : ''}`}>
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
        <div className="flex items-center justify-between flex-wrap gap-2">
          <span className="text-xs text-slate-500 font-semibold">
            {sorted.length} résultat{sorted.length !== 1 ? 's' : ''}
          </span>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setPage(p => Math.max(0, p - 1))}
              disabled={page === 0}
              className="p-1.5 text-slate-400 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed hover:bg-navy-700 rounded-lg transition-colors"
            >
              <ChevronLeft size={16}/>
            </button>
            <span className="text-xs font-bold text-slate-300">{page + 1} / {totalPages}</span>
            <button
              onClick={() => setPage(p => Math.min(totalPages - 1, p + 1))}
              disabled={page >= totalPages - 1}
              className="p-1.5 text-slate-400 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed hover:bg-navy-700 rounded-lg transition-colors"
            >
              <ChevronRight size={16}/>
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
