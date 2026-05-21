import React, { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import api from '../../services/api'
import { DataTable } from '../../components/ui/DataTable'
import { Badge } from '../../components/ui/Badge'
import { Modal } from '../../components/ui/Modal'
import { formatDateTime, formatDate, formatCFA } from '../../utils/format'
import { CheckCircle, XCircle, AlertTriangle, Building2, Phone, Mail, MapPin, FileText, ShoppingCart, Package, ChevronDown, ChevronRight, Eye } from 'lucide-react'
import toast from 'react-hot-toast'

export const Professionals: React.FC = () => {
  const [tab, setTab] = useState<'pending' | 'all'>('all')
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [detailTab, setDetailTab] = useState<'info' | 'catalogue' | 'orders'>('info')
  const [rejectNote, setRejectNote] = useState('')
  const [openCats, setOpenCats] = useState<Set<string>>(new Set())
  const qc = useQueryClient()

  const { data: pending = [], isLoading: pendingLoading } = useQuery({
    queryKey: ['pending-professionals'],
    queryFn: () => api.get('/admin/pending/professionals').then((r: any) => {
      if (Array.isArray(r)) return r
      if (Array.isArray(r?.data)) return r.data
      if (Array.isArray(r?.data?.data)) return r.data.data
      return []
    }),
    refetchInterval: 30000,
  })

  const { data: allPros = [], isLoading: allLoading } = useQuery({
    queryKey: ['all-professionals'],
    queryFn: () => api.get('/admin/professionals').then((r: any) => r?.data?.data ?? r?.data ?? []),
  })

  // Helpers pour unwrapper les réponses backend qui retournent { data: X }
  // après le TransformInterceptor : HTTP = { success, data: { data: X } }
  // → après axios interceptor r = { success, data: { data: X } }
  // → r?.data?.data = X
  const unwrap = (r: any) => r?.data?.data ?? r?.data ?? r

  const { data: proDetail } = useQuery({
    queryKey: ['pro-detail', selectedId],
    queryFn: () => api.get(`/admin/professionals/${selectedId}`).then(unwrap),
    enabled: !!selectedId,
  })

  const { data: catalogueData } = useQuery({
    queryKey: ['pro-catalogue', selectedId],
    queryFn: () => api.get(`/admin/catalogue/${selectedId}`).then(unwrap),
    enabled: !!selectedId,
  })

  const { data: ordersData } = useQuery({
    queryKey: ['pro-orders', selectedId],
    queryFn: () => api.get(`/admin/professionals/${selectedId}/orders`).then(unwrap),
    enabled: !!selectedId,
  })

  const validateMutation = useMutation({
    mutationFn: ({ id, status, note }: { id: string; status: string; note?: string }) =>
      api.patch(`/admin/professionals/${id}/validate`, { status, note }),
    onSuccess: (_, vars) => {
      toast.success(vars.status === 'VALIDATED' ? 'Professionnel validé !' : 'Inscription refusée')
      qc.invalidateQueries({ queryKey: ['pending-professionals'] })
      qc.invalidateQueries({ queryKey: ['all-professionals'] })
      qc.invalidateQueries({ queryKey: ['pro-detail', vars.id] })
      setSelectedId(null)
    },
    onError: (e: any) => toast.error(e.message),
  })

  const openDetail = (row: any) => {
    setSelectedId(row.id)
    setDetailTab('info')
    setRejectNote('')
    setOpenCats(new Set())
  }

  const toggleCat = (id: string) => setOpenCats(prev => {
    const next = new Set(prev)
    next.has(id) ? next.delete(id) : next.add(id)
    return next
  })

  const baseColumns = [
    {
      key: 'businessName', label: 'Établissement',
      sortable: true,
      sortValue: (r: any) => (r.businessName ?? '').toLowerCase(),
      exportValue: (r: any) => `${r.businessName ?? ''} ${r.user?.name ? '(' + r.user.name + ')' : ''}`.trim(),
      render: (r: any) => (
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-brand-green/10 border border-brand-green/20 flex items-center justify-center flex-shrink-0">
            <Building2 size={13} className="text-brand-green"/>
          </div>
          <div>
            <div className="font-semibold text-slate-200 text-sm">{r.businessName || '—'}</div>
            <div className="text-xs text-slate-500">{r.user?.name || '—'} · {r.user?.phone || '—'}</div>
          </div>
        </div>
      ),
    },
    { key: 'category', label: 'Type',
      sortable: true, hideOnMobile: true,
      exportValue: (r: any) => r.category ?? '',
      render: (r: any) => <span className="text-xs font-bold text-slate-400 bg-navy-700 px-2 py-1 rounded-lg">{r.category || '—'}</span> },
    { key: 'city', label: 'Ville',
      sortable: true, hideOnMobile: true,
      sortValue: (r: any) => `${r.city ?? ''} ${r.country ?? ''}`.toLowerCase(),
      exportValue: (r: any) => `${r.city ?? ''}, ${r.country ?? ''}`,
      render: (r: any) => <span className="text-sm text-slate-300">{r.city}, {r.country}</span> },
    { key: 'status', label: 'Statut',
      sortable: true,
      exportValue: (r: any) => r.status ?? 'PENDING',
      render: (r: any) => <Badge status={r.status || 'PENDING'}/> },
    { key: 'createdAt', label: 'Inscription',
      sortable: true, hideOnMobile: true,
      sortValue: (r: any) => r.createdAt ? new Date(r.createdAt).getTime() : 0,
      exportValue: (r: any) => r.createdAt,
      render: (r: any) => <span className="text-xs text-slate-400">{formatDateTime(r.createdAt)}</span> },
  ]

  const pendingColumns = [
    ...baseColumns,
    {
      key: 'actions', label: '', width: '100px',
      render: (r: any) => (
        <div className="flex gap-1" onClick={e => e.stopPropagation()}>
          <button
            title="Voir le dossier"
            onClick={() => openDetail(r)}
            className="p-1.5 text-blue-400 hover:bg-blue-500/10 rounded-lg transition-colors"
          ><Eye size={14}/></button>
          <button
            title="Valider"
            onClick={() => { if (window.confirm(`Valider ${r.businessName} ?`)) validateMutation.mutate({ id: r.id, status: 'VALIDATED' }) }}
            className="p-1.5 text-green-400 hover:bg-green-500/10 rounded-lg transition-colors"
          ><CheckCircle size={14}/></button>
          <button
            title="Refuser"
            onClick={() => openDetail(r)}
            className="p-1.5 text-red-400 hover:bg-red-500/10 rounded-lg transition-colors"
          ><XCircle size={14}/></button>
        </div>
      ),
    },
  ]

  const selected = proDetail
  const categories = catalogueData?.categories ?? []
  const proOrders = ordersData?.orders ?? []
  const orderStats = ordersData?.stats

  return (
    <div className="space-y-4">
      {pending.length > 0 && (
        <div className="flex items-center gap-3 p-4 bg-yellow-500/10 border border-yellow-500/30 rounded-xl">
          <AlertTriangle size={18} className="text-yellow-400 flex-shrink-0"/>
          <span className="text-sm font-bold text-yellow-400">
            {pending.length} inscription{pending.length > 1 ? 's' : ''} en attente de validation
          </span>
        </div>
      )}

      <div className="flex gap-2">
        {(['pending', 'all'] as const).map(t => (
          <button key={t} onClick={() => setTab(t)}
            className={`px-4 py-2 rounded-xl text-sm font-bold transition-all ${tab === t ? 'bg-brand-green text-white' : 'bg-navy-800 text-slate-400 border border-navy-600 hover:text-slate-200'}`}>
            {t === 'pending' ? `En attente (${pending.length})` : 'Tous les pros'}
          </button>
        ))}
      </div>

      <div className="card p-5">
        {tab === 'pending'
          ? <DataTable
              columns={pendingColumns}
              data={pending}
              loading={pendingLoading}
              onRowClick={openDetail}
              exportable
              exportFilename="professionnels-en-attente"
            />
          : <DataTable
              columns={baseColumns}
              data={allPros}
              loading={allLoading}
              onRowClick={openDetail}
              exportable
              exportFilename="professionnels"
            />
        }
      </div>

      <Modal open={!!selectedId} onClose={() => setSelectedId(null)} title="Fiche établissement" size="xl">
        {selected ? (
          <div className="space-y-4">
            {/* Header */}
            <div className="flex items-start justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-xl bg-brand-green/10 border border-brand-green/20 flex items-center justify-center flex-shrink-0">
                  <Building2 size={20} className="text-brand-green"/>
                </div>
                <div>
                  <div className="font-black text-slate-100 text-base">{selected.businessName || '—'}</div>
                  <div className="text-sm text-slate-400">{selected.category || '—'} · {selected.city}, {selected.country}</div>
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
              {([
                { key: 'info', label: 'Informations' },
                { key: 'catalogue', label: 'Catalogue' },
                { key: 'orders', label: 'Commandes' },
              ] as const).map(({ key, label }) => (
                <button key={key} onClick={() => setDetailTab(key)}
                  className={`px-4 py-2 text-sm font-bold border-b-2 -mb-px transition-all ${detailTab === key ? 'border-brand-green text-brand-green' : 'border-transparent text-slate-400 hover:text-slate-200'}`}>
                  {label}
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
                      <div className="label text-[10px]">Responsable</div>
                      <div className="text-sm font-semibold text-slate-200">{selected.user?.name || '—'}</div>
                      <div className="text-xs text-slate-500">{selected.user?.phone || '—'}</div>
                    </div>
                  </div>
                  <div className="card-sm p-3 flex items-center gap-2">
                    <Mail size={14} className="text-slate-500 flex-shrink-0"/>
                    <div>
                      <div className="label text-[10px]">Email</div>
                      <div className="text-sm font-semibold text-slate-200 truncate">{selected.user?.email || '—'}</div>
                    </div>
                  </div>
                  <div className="card-sm p-3 flex items-center gap-2 col-span-2">
                    <MapPin size={14} className="text-slate-500 flex-shrink-0"/>
                    <div>
                      <div className="label text-[10px]">Adresse</div>
                      <div className="text-sm font-semibold text-slate-200">{selected.address || '—'}</div>
                      <div className="text-xs text-slate-500">{selected.city}, {selected.country}</div>
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

            {/* Onglet : Catalogue */}
            {detailTab === 'catalogue' && (
              <div>
                {!catalogueData
                  ? <div className="flex justify-center py-10"><div className="w-6 h-6 border-2 border-brand-green border-t-transparent rounded-full animate-spin"/></div>
                  : categories.length === 0
                    ? <div className="text-center py-10 text-slate-500 text-sm">Aucune catégorie dans le catalogue</div>
                    : (
                      <div className="space-y-2 max-h-96 overflow-y-auto pr-1">
                        {categories.map((cat: any) => (
                          <div key={cat.id} className="card-sm overflow-hidden">
                            <button
                              onClick={() => toggleCat(cat.id)}
                              className="w-full flex items-center justify-between p-3 text-left hover:bg-navy-700/50 transition-colors"
                            >
                              <div className="flex items-center gap-2">
                                <span className="text-sm font-bold text-slate-200">{cat.name}</span>
                                <span className="text-xs text-slate-500 bg-navy-700 px-1.5 py-0.5 rounded-md">{cat.products?.length || 0} produit{cat.products?.length !== 1 ? 's' : ''}</span>
                              </div>
                              {openCats.has(cat.id) ? <ChevronDown size={14} className="text-slate-500"/> : <ChevronRight size={14} className="text-slate-500"/>}
                            </button>
                            {openCats.has(cat.id) && cat.products?.length > 0 && (
                              <div className="border-t border-navy-700 divide-y divide-navy-700">
                                {cat.products.map((p: any) => (
                                  <div key={p.id} className="flex items-center justify-between px-4 py-2 gap-3">
                                    <div className="min-w-0">
                                      <div className="text-sm text-slate-300 font-semibold truncate">{p.name}</div>
                                      {p.description && <div className="text-xs text-slate-500 truncate">{p.description}</div>}
                                    </div>
                                    <div className="flex items-center gap-2 flex-shrink-0">
                                      <span className="text-sm font-bold text-slate-200">{formatCFA(p.price)}</span>
                                      <span className={`text-xs font-semibold px-1.5 py-0.5 rounded-md ${p.isAvailable ? 'text-green-400 bg-green-500/10' : 'text-slate-500 bg-navy-700'}`}>
                                        {p.isAvailable ? 'Dispo' : 'Indispo'}
                                      </span>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    )
                }
              </div>
            )}

            {/* Onglet : Commandes */}
            {detailTab === 'orders' && (
              <div className="space-y-3">
                {!ordersData
                  ? <div className="flex justify-center py-10"><div className="w-6 h-6 border-2 border-brand-green border-t-transparent rounded-full animate-spin"/></div>
                  : (
                    <>
                      {orderStats && (
                        <div className="grid grid-cols-2 gap-3">
                          <div className="card-sm p-3 text-center">
                            <div className="text-2xl font-black text-slate-100">{orderStats.total}</div>
                            <div className="text-xs text-slate-500 font-semibold">Commandes totales</div>
                          </div>
                          <div className="card-sm p-3 text-center">
                            <div className="text-2xl font-black text-brand-green">{formatCFA(orderStats.revenue)}</div>
                            <div className="text-xs text-slate-500 font-semibold">Chiffre d'affaires</div>
                          </div>
                        </div>
                      )}

                      {proOrders.length === 0
                        ? <div className="text-center py-8 text-slate-500 text-sm">Aucune commande reçue</div>
                        : (
                          <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
                            {proOrders.map((o: any) => (
                              <div key={o.id} className="card-sm p-3 flex items-center justify-between gap-3">
                                <div className="flex items-center gap-2 min-w-0">
                                  <ShoppingCart size={14} className="text-slate-500 flex-shrink-0"/>
                                  <div className="min-w-0">
                                    <div className="text-sm font-semibold text-slate-200 truncate">{o.client?.name || '—'}</div>
                                    <div className="text-xs text-slate-500">
                                      {formatDate(o.createdAt)}
                                      {o.driver?.user?.name && ` · ${o.driver.user.name}`}
                                    </div>
                                  </div>
                                </div>
                                <div className="flex items-center gap-2 flex-shrink-0">
                                  <span className="text-xs font-bold text-slate-300">{formatCFA(o.totalAmount)}</span>
                                  <Badge status={o.status}/>
                                </div>
                              </div>
                            ))}
                          </div>
                        )
                      }
                    </>
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
