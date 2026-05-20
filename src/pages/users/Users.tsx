import React, { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import api from '../../services/api'
import { DataTable } from '../../components/ui/DataTable'
import { Badge } from '../../components/ui/Badge'
import { Modal } from '../../components/ui/Modal'
import { formatDateTime } from '../../utils/format'
import { useFiltersStore } from '../../store/filters'
import { UserX, UserCheck, Trash2, ExternalLink } from 'lucide-react'
import toast from 'react-hot-toast'

export const Users: React.FC = () => {
  const qc = useQueryClient()
  const { country } = useFiltersStore()
  const [selected, setSelected] = useState<any>(null)

  const { data, isLoading } = useQuery({
    queryKey: ['admin-users', country],
    queryFn: () => {
      const params = new URLSearchParams({ role: 'CLIENT' })
      if (country) params.set('country', country)
      return api.get(`/admin/users?${params}`).then((r: any) => r?.data?.data ?? r?.data ?? [])
    },
  })

  const statusMutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: string }) => api.patch(`/admin/users/${id}/status`, { status }),
    onSuccess: () => { toast.success('Statut mis à jour'); qc.invalidateQueries({ queryKey: ['admin-users'] }); setSelected(null) },
    onError: (e: any) => toast.error(e.message),
  })

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.delete(`/admin/users/${id}`),
    onSuccess: () => { toast.success('Compte supprimé'); qc.invalidateQueries({ queryKey: ['admin-users'] }); setSelected(null) },
    onError: (e: any) => toast.error(e.message),
  })

  const columns = [
    { key: 'name', label: 'Nom', render: (r: any) => (
      <div className="flex items-center gap-2">
        <div className="w-7 h-7 rounded-full bg-brand-green/20 border border-brand-green/30 flex items-center justify-center flex-shrink-0">
          <span className="text-brand-green font-black text-[10px]">{(r.firstName || r.name || 'C')[0].toUpperCase()}</span>
        </div>
        <span className="font-semibold text-slate-200">{r.firstName} {r.name}</span>
      </div>
    )},
    { key: 'phone', label: 'Téléphone', render: (r: any) => <span className="text-sm font-mono text-slate-300">{r.phone}</span> },
    { key: 'countryCode', label: 'Pays', render: (r: any) => <span className="text-sm text-slate-400">{r.countryCode} · {r.currency}</span> },
    { key: 'status', label: 'Statut', render: (r: any) => <Badge status={r.status}/> },
    { key: 'createdAt', label: "Inscription", render: (r: any) => <span className="text-xs text-slate-400">{formatDateTime(r.createdAt)}</span> },
    { key: 'actions', label: '', width: '80px', render: (r: any) => (
      <div className="flex gap-1">
        <button onClick={(e) => { e.stopPropagation(); setSelected(r) }} className="p-1.5 text-slate-400 hover:text-white hover:bg-navy-700 rounded-lg">
          <ExternalLink size={14}/>
        </button>
        {r.status === 'ACTIVE'
          ? <button onClick={(e) => { e.stopPropagation(); if (window.confirm(`Suspendre ${r.firstName ?? ''} ${r.name ?? r.phone} ?`)) statusMutation.mutate({ id: r.id, status: 'SUSPENDED' }) }}
              className="p-1.5 text-yellow-400 hover:bg-yellow-500/10 rounded-lg"><UserX size={14}/></button>
          : <button onClick={(e) => { e.stopPropagation(); statusMutation.mutate({ id: r.id, status: 'ACTIVE' }) }}
              className="p-1.5 text-green-400 hover:bg-green-500/10 rounded-lg"><UserCheck size={14}/></button>
        }
      </div>
    )},
  ]

  return (
    <div className="space-y-4">
      <div className="card p-5">
        <DataTable columns={columns} data={data || []} loading={isLoading} onRowClick={setSelected}/>
      </div>

      <Modal open={!!selected} onClose={() => setSelected(null)} title="Détail client" size="md">
        {selected && (
          <div className="space-y-4">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 rounded-2xl bg-brand-green/15 border border-brand-green/30 flex items-center justify-center flex-shrink-0">
                <span className="text-brand-green font-black text-xl">{(selected.firstName || selected.name || 'C')[0].toUpperCase()}</span>
              </div>
              <div>
                <div className="text-lg font-black text-slate-100">{selected.firstName} {selected.name}</div>
                <div className="text-sm text-slate-400 font-mono">{selected.phone}</div>
                {selected.email && <div className="text-xs text-slate-500">{selected.email}</div>}
              </div>
              <div className="ml-auto"><Badge status={selected.status}/></div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="card-sm p-3">
                <div className="text-xs text-slate-500 font-bold mb-1">Pays / Devise</div>
                <div className="font-semibold text-slate-200">{selected.countryCode} · {selected.currency}</div>
              </div>
              <div className="card-sm p-3">
                <div className="text-xs text-slate-500 font-bold mb-1">Inscription</div>
                <div className="text-sm font-semibold text-slate-300">{formatDateTime(selected.createdAt)}</div>
              </div>
            </div>

            <div className="card-sm p-3">
              <div className="text-xs text-slate-500 font-bold mb-1">ID compte</div>
              <div className="text-xs font-mono text-slate-400 break-all">{selected.id}</div>
            </div>

            <div className="flex gap-3 pt-2">
              {selected.status === 'ACTIVE'
                ? <button onClick={() => { if (window.confirm(`Suspendre ce compte ?`)) statusMutation.mutate({ id: selected.id, status: 'SUSPENDED' }) }}
                    disabled={statusMutation.isPending} className="btn-secondary flex-1 justify-center text-yellow-400 border-yellow-500/30 hover:bg-yellow-500/10">
                    <UserX size={15}/> Suspendre
                  </button>
                : <button onClick={() => statusMutation.mutate({ id: selected.id, status: 'ACTIVE' })}
                    disabled={statusMutation.isPending} className="btn-secondary flex-1 justify-center text-green-400 border-green-500/30 hover:bg-green-500/10">
                    <UserCheck size={15}/> Réactiver
                  </button>
              }
              <button onClick={() => {
                if (window.confirm(`Supprimer définitivement le compte de ${selected.firstName ?? ''} ${selected.name ?? selected.phone} ?\n\nCette action est irréversible.`))
                  deleteMutation.mutate(selected.id)
              }} disabled={deleteMutation.isPending} className="btn-danger justify-center px-4">
                <Trash2 size={15}/>
              </button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  )
}
