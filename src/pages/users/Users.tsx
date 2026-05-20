import React from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import api from '../../services/api'
import { DataTable } from '../../components/ui/DataTable'
import { Badge } from '../../components/ui/Badge'
import { formatDateTime } from '../../utils/format'
import { UserX, UserCheck } from 'lucide-react'
import toast from 'react-hot-toast'

export const Users: React.FC = () => {
  const qc = useQueryClient()
  const { data, isLoading } = useQuery({
    queryKey: ['admin-users'],
    queryFn: () => api.get('/admin/users?role=CLIENT').then((r: any) => r?.data?.data ?? r?.data ?? []),
  })
  const statusMutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: string }) => api.patch(`/admin/users/${id}/status`, { status }),
    onSuccess: () => { toast.success('Statut mis à jour'); qc.invalidateQueries({ queryKey: ['admin-users'] }) },
    onError: (e: any) => toast.error(e.message),
  })
  const columns = [
    { key: 'name', label: 'Nom', render: (r: any) => <span className="font-semibold text-slate-200">{r.firstName} {r.name}</span> },
    { key: 'phone', label: 'Téléphone', render: (r: any) => <span className="text-sm font-mono text-slate-300">{r.phone}</span> },
    { key: 'countryCode', label: 'Pays', render: (r: any) => <span className="text-sm text-slate-400">{r.countryCode} · {r.currency}</span> },
    { key: 'status', label: 'Statut', render: (r: any) => <Badge status={r.status}/> },
    { key: 'createdAt', label: "Date d'inscription", render: (r: any) => <span className="text-xs text-slate-400">{formatDateTime(r.createdAt)}</span> },
    { key: 'actions', label: '', width: '80px', render: (r: any) => (
      <div className="flex gap-1">
        {r.status === 'ACTIVE'
          ? <button onClick={() => {
              if (window.confirm(`Suspendre le compte de ${r.firstName ?? ''} ${r.name ?? r.phone} ?`))
                statusMutation.mutate({ id: r.id, status: 'SUSPENDED' })
            }} className="p-1.5 text-yellow-400 hover:bg-yellow-500/10 rounded-lg"><UserX size={14}/></button>
          : <button onClick={() => statusMutation.mutate({ id: r.id, status: 'ACTIVE' })} className="p-1.5 text-green-400 hover:bg-green-500/10 rounded-lg"><UserCheck size={14}/></button>
        }
      </div>
    )},
  ]
  return (
    <div className="card p-5">
      <DataTable columns={columns} data={data || []} loading={isLoading}/>
    </div>
  )
}
