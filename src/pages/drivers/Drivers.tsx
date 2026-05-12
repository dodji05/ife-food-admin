import React, { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import api from '../../services/api'
import { DataTable } from '../../components/ui/DataTable'
import { Badge } from '../../components/ui/Badge'
import { formatDateTime } from '../../utils/format'
import { CheckCircle, XCircle, AlertTriangle } from 'lucide-react'
import toast from 'react-hot-toast'

export const Drivers: React.FC = () => {
  const [tab, setTab] = useState<'pending' | 'all'>('pending')
  const qc = useQueryClient()
  const { data: pending, isLoading } = useQuery({
    queryKey: ['pending-drivers'],
    queryFn: () => api.get('/admin/pending/drivers').then((r: any) => r.data ?? r ?? []),
    refetchInterval: 30000,
  })
  const validateMutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: string }) => api.patch(`/admin/drivers/${id}/validate`, { status }),
    onSuccess: () => { toast.success('Statut mis à jour'); qc.invalidateQueries({ queryKey: ['pending-drivers'] }) },
    onError: (e: any) => toast.error(e.message),
  })
  const columns = [
    { key: 'user', label: 'Livreur', render: (r: any) => <div><div className="font-semibold text-slate-200">{r.user?.name || '—'}</div><div className="text-xs text-slate-500">{r.user?.phone}</div></div> },
    { key: 'vehicleType', label: 'Véhicule', render: (r: any) => <span className="text-sm text-slate-300">{r.vehicleType}</span> },
    { key: 'zoneCity', label: 'Zone', render: (r: any) => <span className="text-sm text-slate-400">{r.zoneCity || '—'}</span> },
    { key: 'status', label: 'Statut', render: (r: any) => <Badge status={r.status}/> },
    { key: 'createdAt', label: 'Soumis le', render: (r: any) => <span className="text-xs text-slate-400">{formatDateTime(r.createdAt)}</span> },
    { key: 'actions', label: '', width: '80px', render: (r: any) => r.status === 'PENDING' ? (
      <div className="flex gap-1">
        <button onClick={() => {
          if (window.confirm(`Valider le dossier de ${r.user?.name ?? r.user?.phone ?? 'ce livreur'} ?`))
            validateMutation.mutate({ id: r.id, status: 'VALIDATED' })
        }} className="p-1.5 text-green-400 hover:bg-green-500/10 rounded-lg"><CheckCircle size={14}/></button>
        <button onClick={() => {
          if (window.confirm(`Rejeter le dossier de ${r.user?.name ?? r.user?.phone ?? 'ce livreur'} ?`))
            validateMutation.mutate({ id: r.id, status: 'REJECTED' })
        }} className="p-1.5 text-red-400 hover:bg-red-500/10 rounded-lg"><XCircle size={14}/></button>
      </div>
    ) : null },
  ]
  return (
    <div className="space-y-4">
      {(pending?.length || 0) > 0 && (
        <div className="flex items-center gap-3 p-4 bg-yellow-500/10 border border-yellow-500/30 rounded-xl">
          <AlertTriangle size={18} className="text-yellow-400 flex-shrink-0"/>
          <span className="text-sm font-bold text-yellow-400">{pending?.length} livreur{pending?.length > 1 ? 's' : ''} en attente de validation</span>
        </div>
      )}
      <div className="card p-5">
        <DataTable columns={columns} data={pending || []} loading={isLoading}/>
      </div>
    </div>
  )
}
