import React, { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import api from '../../services/api'
import { DataTable } from '../../components/ui/DataTable'
import { Badge } from '../../components/ui/Badge'
import { Modal } from '../../components/ui/Modal'
import { formatDateTime, formatDate, formatCFA } from '../../utils/format'
import { CheckCircle, XCircle, AlertTriangle, Truck, Phone, Mail, MapPin, FileText, Package } from 'lucide-react'
import toast from 'react-hot-toast'

export const Drivers: React.FC = () => {
  const [tab, setTab] = useState<'pending' | 'all'>('all')
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [detailTab, setDetailTab] = useState<'info' | 'missions'>('info')
  const [rejectNote, setRejectNote] = useState('')
  const qc = useQueryClient()

  const { data: pending = [], isLoading: pendingLoading } = useQuery({
    queryKey: ['pending-drivers'],
    queryFn: () => api.get('/admin/pending/drivers').then((r: any) => {
      if (Array.isArray(r)) return r
      if (Array.isArray(r?.data)) return r.data
      if (Array.isArray(r?.data?.data)) return r.data.data
      return []
    }),
    refetchInterval: 30000,
  })

  const { data: allDrivers = [], isLoading: allLoading } = useQuery({
    queryKey: ['all-drivers'],
    queryFn: () => api.get('/admin/drivers').then((r: any) => {
      if (Array.isArray(r)) return r
      if (Array.isArray(r?.data?.data)) return r.data.data
      if (Array.isArray(r?.data)) return r.data
      return []
    }),
  })

  const { data: driverDetail } = useQuery({
    queryKey: ['driver-detail', selectedId],
    queryFn: () => api.get(`/admin/drivers/${selectedId}`).then((r: any) => r?.data ?? r),
    enabled: !!selectedId,
  })

  const { data: missions = [], isLoading: missionsLoading } = useQuery({
    queryKey: ['driver-missions', selectedId],
    queryFn: () => api.get(`/admin/drivers/${selectedId}/missions`).then((r: any) => {
      if (Array.isArray(r?.data)) return r.data
      if (Array.isArray(r?.data?.data)) return r.data.data
      return []
    }),
    enabled: !!selectedId && detailTab === 'missions',
  })

  const validateMutation = useMutation({
    mutationFn: ({ id, status, note }: { id: string; status: string; note?: string }) =>
      api.patch(`/admin/drivers/${id}/validate`, { status, note }),
    onSuccess: (_, vars) => {
      toast.success(vars.status === 'VALIDATED' ? 'Livreur validé' : 'Inscription refusée')
      qc.invalidateQueries({ queryKey: ['pending-drivers'] })
      qc.invalidateQueries({ queryKey: ['all-drivers'] })
      qc.invalidateQueries({ queryKey: ['driver-detail', vars.id] })
      setSelectedId(null)
    },
    onError: (e: any) => toast.error(e.message),
  })

  const openDetail = (row: any) => {
    setSelectedId(row.id)
    setDetailTab('info')
    setRejectNote('')
  }

  const columns = [
    {
      key: 'user', label: 'Livreur',
      render: (r: any) => (
        <div>
          <div className="font-semibold text-slate-200">{r.user?.name || '—'}</div>
          <div className="text-xs text-slate-500">{r.user?.phone}</div>
        </div>
      ),
    },
    { key: 'vehicleType', label: 'Véhicule', render: (r: any) => <span className="text-sm text-slate-300">{r.vehicleType || '—'}</span> },
    { key: 'zoneCity', label: 'Zone', render: (r: any) => <span className="text-sm text-slate-400">{r.zoneCity || '—'}</span> },
    { key: 'status', label: 'Statut', render: (r: any) => <Badge status={r.status || 'PENDING'}/> },
    { key: 'createdAt', label: 'Inscription', render: (r: any) => <span className="text-xs text-slate-400">{formatDateTime(r.createdAt)}</span> },
  ]

  const selected = driverDetail

  return (
    <div className="space-y-4">
      {pending.length > 0 && (
        <div className="flex items-center gap-3 p-4 bg-yellow-500/10 border border-yellow-500/30 rounded-xl">
          <AlertTriangle size={18} className="text-yellow-400 flex-shrink-0"/>
          <span className="text-sm font-bold text-yellow-400">
            {pending.length} livreur{pending.length > 1 ? 's' : ''} en attente de validation
          </span>
        </div>
      )}

      <div className="flex gap-2">
        <button onClick={() => setTab('pending')} className={`px-4 py-2 rounded-xl text-sm font-bold transition-all ${tab === 'pending' ? 'bg-brand-green text-white' : 'bg-navy-800 text-slate-400 border border-navy-600 hover:text-slate-200'}`}>
          En attente ({pending.length})
        </button>
        <button onClick={() => setTab('all')} className={`px-4 py-2 rounded-xl text-sm font-bold transition-all ${tab === 'all' ? 'bg-brand-green text-white' : 'bg-navy-800 text-slate-400 border border-navy-600 hover:text-slate-200'}`}>
          Tous les livreurs
        </button>
      </div>

      <div className="card p-5">
        {tab === 'pending'
          ? <DataTable columns={columns} data={pending} loading={pendingLoading} onRowClick={openDetail}/>
          : <DataTable columns={columns} data={allDrivers} loading={allLoading} onRowClick={openDetail}/>
        }
      </div>

      <Modal open={!!selectedId} onClose={() => setSelectedId(null)} title="Fiche livreur" size="xl">
        {selected ? (
          <div className="space-y-4">
            {/* Header */}
            <div className="flex items-start justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-xl bg-brand-green/10 border border-brand-green/20 flex items-center justify-center flex-shrink-0">
                  <Truck size={20} className="text-brand-green"/>
                </div>
                <div>
                  <div className="font-black text-slate-100 text-base">{selected.user?.name || '—'}</div>
                  <div className="text-sm text-slate-400">{selected.vehicleType || '—'} · {selected.zoneCity || '—'}</div>
                </div>
              </div>
              <Badge status={selected.status || 'PENDING'}/>
            </div>

            {/* Validation rapide si PENDING */}
            {selected.status === 'PENDING' && (
              <div className="p-4 bg-yellow-500/10 border border-yellow-500/30 rounded-xl space-y-3">
                <div className="text-sm font-bold text-yellow-400">Dossier en attente de validation</div>
                <textarea
                  value={rejectNote}
                  onChange={e => setRejectNote(e.target.value)}
                  className="input h-16 resize-none text-sm"
                  placeholder="Note de refus (optionnel)…"
                />
                <div className="flex gap-2">
                  <button onClick={() => validateMutation.mutate({ id: selected.id, status: 'REJECTED', note: rejectNote })}
                    disabled={validateMutation.isPending} className="btn-danger flex-1 justify-center">
                    <XCircle size={14}/> Refuser
                  </button>
                  <button onClick={() => validateMutation.mutate({ id: selected.id, status: 'VALIDATED' })}
                    disabled={validateMutation.isPending} className="btn-primary flex-1 justify-center">
                    <CheckCircle size={14}/> Valider
                  </button>
                </div>
              </div>
            )}

            {/* Onglets */}
            <div className="flex gap-1 border-b border-navy-700">
              {(['info', 'missions'] as const).map(t => (
                <button key={t} onClick={() => setDetailTab(t)}
                  className={`px-4 py-2 text-sm font-bold border-b-2 -mb-px transition-all ${detailTab === t ? 'border-brand-green text-brand-green' : 'border-transparent text-slate-400 hover:text-slate-200'}`}>
                  {t === 'info' ? 'Informations' : 'Missions'}
                </button>
              ))}
            </div>

            {/* Onglet : Infos */}
            {detailTab === 'info' && (
              <div className="space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <div className="card-sm p-3 flex items-center gap-2">
                    <Phone size={14} className="text-slate-500 flex-shrink-0"/>
                    <div>
                      <div className="label text-[10px]">Téléphone</div>
                      <div className="text-sm font-semibold text-slate-200">{selected.user?.phone || '—'}</div>
                    </div>
                  </div>
                  <div className="card-sm p-3 flex items-center gap-2">
                    <Mail size={14} className="text-slate-500 flex-shrink-0"/>
                    <div>
                      <div className="label text-[10px]">Email</div>
                      <div className="text-sm font-semibold text-slate-200 truncate">{selected.user?.email || '—'}</div>
                    </div>
                  </div>
                  <div className="card-sm p-3 flex items-center gap-2">
                    <MapPin size={14} className="text-slate-500 flex-shrink-0"/>
                    <div>
                      <div className="label text-[10px]">Zone</div>
                      <div className="text-sm font-semibold text-slate-200">{selected.zoneCity || '—'}</div>
                    </div>
                  </div>
                  <div className="card-sm p-3 flex items-center gap-2">
                    <Truck size={14} className="text-slate-500 flex-shrink-0"/>
                    <div>
                      <div className="label text-[10px]">Véhicule</div>
                      <div className="text-sm font-semibold text-slate-200">{selected.vehicleType || '—'}</div>
                    </div>
                  </div>
                </div>

                <div className="card-sm p-3">
                  <div className="label mb-2 flex items-center gap-1.5"><FileText size={13}/> Documents soumis ({selected.documents?.length || 0})</div>
                  {selected.documents?.length > 0
                    ? <div className="flex gap-2 flex-wrap">
                        {selected.documents.map((d: any) => (
                          <a key={d.id} href={d.url} target="_blank" rel="noopener noreferrer"
                            className="text-xs bg-navy-700 text-blue-400 hover:text-blue-300 px-2 py-1 rounded-lg font-semibold transition-colors">
                            {d.type}
                          </a>
                        ))}
                      </div>
                    : <div className="text-sm text-yellow-400 font-semibold">Aucun document soumis</div>
                  }
                </div>

                {selected.adminNote && (
                  <div className="card-sm p-3">
                    <div className="label text-[10px] mb-1">Note admin</div>
                    <div className="text-sm text-slate-300">{selected.adminNote}</div>
                  </div>
                )}

                <div className="text-xs text-slate-500 text-right">Inscrit le {formatDate(selected.createdAt)}</div>
              </div>
            )}

            {/* Onglet : Missions */}
            {detailTab === 'missions' && (
              <div>
                {missionsLoading
                  ? <div className="flex justify-center py-10"><div className="w-6 h-6 border-2 border-brand-green border-t-transparent rounded-full animate-spin"/></div>
                  : missions.length === 0
                    ? <div className="text-center py-10 text-slate-500 text-sm">Aucune mission pour l'instant</div>
                    : (
                      <div className="space-y-2 max-h-96 overflow-y-auto pr-1">
                        {missions.map((m: any) => (
                          <div key={m.id} className="card-sm p-3 flex items-center justify-between gap-3">
                            <div className="flex items-center gap-2 min-w-0">
                              <Package size={14} className="text-slate-500 flex-shrink-0"/>
                              <div className="min-w-0">
                                <div className="text-sm font-semibold text-slate-200 truncate">{m.professional?.businessName || '—'}</div>
                                <div className="text-xs text-slate-500">{m.client?.name || '—'} · {formatDate(m.createdAt)}</div>
                              </div>
                            </div>
                            <div className="flex items-center gap-2 flex-shrink-0">
                              <span className="text-xs font-bold text-slate-300">{formatCFA(m.totalAmount)}</span>
                              <Badge status={m.status}/>
                            </div>
                          </div>
                        ))}
                      </div>
                    )
                }
              </div>
            )}
          </div>
        ) : (
          <div className="flex justify-center py-10"><div className="w-6 h-6 border-2 border-brand-green border-t-transparent rounded-full animate-spin"/></div>
        )}
      </Modal>
    </div>
  )
}
