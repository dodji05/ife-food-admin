import React, { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import api from '../../services/api'
import { DataTable } from '../../components/ui/DataTable'
import { Badge } from '../../components/ui/Badge'
import { formatDateTime } from '../../utils/format'
import { CheckCircle, XCircle, AlertTriangle } from 'lucide-react'
import toast from 'react-hot-toast'

export const Drivers: React.FC = () => {
  const [tab, setTab] = useState<'pending' | 'all'>('all')
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

  const validateMutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: string }) =>
      api.patch(`/admin/drivers/${id}/validate`, { status }),
    onSuccess: () => {
      toast.success('Statut mis à jour')
      qc.invalidateQueries({ queryKey: ['pending-drivers'] })
    },
    onError: (e: any) => toast.error(e.message),
  })

  const pendingColumns = [
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
    { key: 'createdAt', label: 'Soumis le', render: (r: any) => <span className="text-xs text-slate-400">{formatDateTime(r.createdAt)}</span> },
    {
      key: 'actions', label: '', width: '80px',
      render: (r: any) => (
        <div className="flex gap-1">
          <button
            onClick={(e) => {
              e.stopPropagation()
              if (window.confirm(`Valider le dossier de ${r.user?.name ?? r.user?.phone ?? 'ce livreur'} ?`))
                validateMutation.mutate({ id: r.id, status: 'VALIDATED' })
            }}
            className="p-1.5 text-green-400 hover:bg-green-500/10 rounded-lg"
          >
            <CheckCircle size={14}/>
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation()
              if (window.confirm(`Rejeter le dossier de ${r.user?.name ?? r.user?.phone ?? 'ce livreur'} ?`))
                validateMutation.mutate({ id: r.id, status: 'REJECTED' })
            }}
            className="p-1.5 text-red-400 hover:bg-red-500/10 rounded-lg"
          >
            <XCircle size={14}/>
          </button>
        </div>
      ),
    },
  ]

  const allColumns = [
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
        <button
          onClick={() => setTab('pending')}
          className={`px-4 py-2 rounded-xl text-sm font-bold transition-all ${tab === 'pending' ? 'bg-brand-green text-white' : 'bg-navy-800 text-slate-400 border border-navy-600 hover:text-slate-200'}`}
        >
          En attente ({pending.length})
        </button>
        <button
          onClick={() => setTab('all')}
          className={`px-4 py-2 rounded-xl text-sm font-bold transition-all ${tab === 'all' ? 'bg-brand-green text-white' : 'bg-navy-800 text-slate-400 border border-navy-600 hover:text-slate-200'}`}
        >
          Tous les livreurs
        </button>
      </div>

      <div className="card p-5">
        {tab === 'pending'
          ? <DataTable columns={pendingColumns} data={pending} loading={pendingLoading}/>
          : <DataTable columns={allColumns} data={allDrivers} loading={allLoading}/>
        }
      </div>
    </div>
  )
}
