import React, { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import api from '../../services/api'
import { DataTable } from '../../components/ui/DataTable'
import { Badge } from '../../components/ui/Badge'
import { Modal } from '../../components/ui/Modal'
import { formatDateTime, statusColor } from '../../utils/format'
import { CheckCircle, XCircle, Eye, Building2, AlertTriangle } from 'lucide-react'
import toast from 'react-hot-toast'

export const Professionals: React.FC = () => {
  const [tab, setTab] = useState<'pending' | 'all'>('all')
  const [selected, setSelected] = useState<any>(null)
  const [rejectNote, setRejectNote] = useState('')
  const qc = useQueryClient()

  const { data: pending, isLoading: pendingLoading } = useQuery({
    queryKey: ['pending-professionals'],
    queryFn: () => api.get('/admin/pending/professionals').then((r: any) => r.data ?? r ?? []),
    refetchInterval: 30000,
  })

  const { data: allPros, isLoading: allLoading } = useQuery({
    queryKey: ['all-professionals'],
    queryFn: () => api.get('/admin/professionals').then((r: any) => r?.data?.data ?? r?.data ?? []),
  })

  const validateMutation = useMutation({
    mutationFn: ({ id, status, note }: { id: string; status: string; note?: string }) =>
      api.patch(`/admin/professionals/${id}/validate`, { status, note }),
    onSuccess: (_, vars) => {
      toast.success(vars.status === 'VALIDATED' ? '✅ Professionnel validé !' : '❌ Inscription refusée')
      qc.invalidateQueries({ queryKey: ['pending-professionals'] })
      setSelected(null)
    },
    onError: (e: any) => toast.error(e.message),
  })

  const pendingColumns = [
    { key: 'businessName', label: 'Établissement', render: (r: any) => (
      <div className="flex items-center gap-2">
        <div className="w-8 h-8 rounded-lg bg-brand-green/10 border border-brand-green/20 flex items-center justify-center flex-shrink-0">
          <Building2 size={14} className="text-brand-green"/>
        </div>
        <div>
          <div className="font-bold text-slate-200 text-sm">{r.businessName}</div>
          <div className="text-xs text-slate-500">{r.category}</div>
        </div>
      </div>
    )},
    { key: 'city', label: 'Ville', render: (r: any) => <span className="text-sm text-slate-300">{r.city}, {r.country}</span> },
    { key: 'user', label: 'Responsable', render: (r: any) => <span className="text-sm text-slate-300">{r.user?.name || '—'} · {r.user?.phone || '—'}</span> },
    { key: 'createdAt', label: 'Soumis le', render: (r: any) => <span className="text-xs text-slate-400">{formatDateTime(r.createdAt)}</span> },
    { key: 'documents', label: 'Docs', render: (r: any) => (
      <span className={`text-xs font-bold ${r.documents?.length > 0 ? 'text-green-400' : 'text-yellow-400'}`}>
        {r.documents?.length || 0} doc{r.documents?.length !== 1 ? 's' : ''}
      </span>
    )},
    { key: 'actions', label: '', width: '120px', render: (r: any) => (
      <div className="flex gap-1.5">
        {/* Voir le dossier */}
        <button onClick={(e) => { e.stopPropagation(); setSelected(r) }}
          title="Voir le dossier" className="p-1.5 text-blue-400 hover:bg-blue-500/10 rounded-lg transition-colors"><Eye size={14}/></button>
        {/* FIX: Valider directement sans ouvrir le modal */}
        <button onClick={(e) => {
          e.stopPropagation()
          if (window.confirm(`Valider l'inscription de ${r.businessName} ?`))
            validateMutation.mutate({ id: r.id, status: 'VALIDATED' })
        }} title="Valider" className="p-1.5 text-green-400 hover:bg-green-500/10 rounded-lg transition-colors"><CheckCircle size={14}/></button>
        {/* FIX: Ouvrir modal avec focus sur la note de refus */}
        <button onClick={(e) => { e.stopPropagation(); setSelected(r); setRejectNote('') }}
          title="Refuser (saisir un motif)" className="p-1.5 text-red-400 hover:bg-red-500/10 rounded-lg transition-colors"><XCircle size={14}/></button>
      </div>
    )},
  ]

  return (
    <div className="space-y-5">
      {(pending?.length || 0) > 0 && (
        <div className="flex items-center gap-3 p-4 bg-yellow-500/10 border border-yellow-500/30 rounded-xl">
          <AlertTriangle size={18} className="text-yellow-400 flex-shrink-0"/>
          <span className="text-sm font-bold text-yellow-400">{pending?.length} inscription{pending?.length > 1 ? 's' : ''} en attente de validation</span>
        </div>
      )}

      <div className="flex gap-2">
        {(['pending', 'all'] as const).map(t => (
          <button key={t} onClick={() => setTab(t)} className={`px-4 py-2 rounded-xl text-sm font-bold transition-all ${tab === t ? 'bg-brand-green text-white' : 'bg-navy-800 text-slate-400 border border-navy-600 hover:text-slate-200'}`}>
            {t === 'pending' ? `En attente (${pending?.length || 0})` : 'Tous les pros'}
          </button>
        ))}
      </div>

      <div className="card p-5">
        {tab === 'pending'
          ? <DataTable columns={pendingColumns} data={pending || []} loading={pendingLoading} onRowClick={setSelected}/>
          : <DataTable columns={[
              { key: 'businessName', label: 'Établissement', render: (r: any) => (
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-lg bg-brand-green/10 border border-brand-green/20 flex items-center justify-center flex-shrink-0">
                    <Building2 size={12} className="text-brand-green"/>
                  </div>
                  <div>
                    <div className="font-semibold text-slate-200 text-sm">{r.businessName || '—'}</div>
                    <div className="text-xs text-slate-500">{r.user?.name || '—'} · {r.user?.phone || '—'}</div>
                  </div>
                </div>
              )},
              { key: 'category', label: 'Type', render: (r: any) => <span className="text-xs font-bold text-slate-400 bg-navy-700 px-2 py-1 rounded-lg">{r.category || '—'}</span> },
              { key: 'city', label: 'Ville', render: (r: any) => <span className="text-sm text-slate-300">{r.city}, {r.country}</span> },
              { key: 'status', label: 'Statut', render: (r: any) => <Badge status={r.status || 'ACTIVE'}/> },
              { key: 'createdAt', label: 'Inscription', render: (r: any) => <span className="text-xs text-slate-400">{formatDateTime(r.createdAt)}</span> },
            ]} data={allPros || []} loading={allLoading}/>
        }
      </div>

      <Modal open={!!selected && tab === 'pending'} onClose={() => setSelected(null)} title="Dossier d'inscription" size="lg">
        {selected && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="card-sm p-3">
                <div className="label">Établissement</div>
                <div className="font-bold text-slate-200">{selected.businessName}</div>
                <div className="text-xs text-slate-400 mt-0.5">{selected.category} · {selected.city}</div>
              </div>
              <div className="card-sm p-3">
                <div className="label">Responsable</div>
                <div className="font-bold text-slate-200">{selected.user?.name || '—'}</div>
                <div className="text-xs text-slate-400">{selected.user?.phone}</div>
              </div>
            </div>
            <div className="card-sm p-3">
              <div className="label">Adresse</div>
              <div className="text-sm text-slate-300">{selected.address}</div>
            </div>
            <div className="card-sm p-3">
              <div className="label">Documents soumis ({selected.documents?.length || 0})</div>
              {selected.documents?.length > 0
                ? <div className="flex gap-2 flex-wrap mt-2">
                    {selected.documents.map((d: any) => <span key={d.id} className="text-xs bg-navy-700 text-slate-300 px-2 py-1 rounded-lg font-semibold">{d.type}</span>)}
                  </div>
                : <div className="text-sm text-yellow-400 font-semibold mt-1">⚠ Aucun document soumis</div>
              }
            </div>
            <div>
              <label className="label">Note de refus (si refus)</label>
              <textarea value={rejectNote} onChange={e => setRejectNote(e.target.value)} className="input h-20 resize-none text-sm" placeholder="Motif du refus (optionnel)…"/>
            </div>
            <div className="flex gap-3 pt-2">
              <button onClick={() => validateMutation.mutate({ id: selected.id, status: 'REJECTED', note: rejectNote })}
                disabled={validateMutation.isPending} className="btn-danger flex-1 justify-center">
                <XCircle size={16}/> Refuser
              </button>
              <button onClick={() => validateMutation.mutate({ id: selected.id, status: 'VALIDATED' })}
                disabled={validateMutation.isPending} className="btn-primary flex-1 justify-center">
                <CheckCircle size={16}/> Valider le compte
              </button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  )
}
