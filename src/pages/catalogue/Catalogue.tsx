import React from 'react'
import { useQuery } from '@tanstack/react-query'
import api from '../../services/api'
import { DataTable } from '../../components/ui/DataTable'
import { Badge } from '../../components/ui/Badge'
import { formatCFA } from '../../utils/format'

export const Catalogue: React.FC = () => {
  const { data, isLoading } = useQuery({
    queryKey: ['admin-catalogue'],
    queryFn: () => api.get('/admin/catalogue/products').then((r: any) => r.data?.data ?? r.data ?? []),
  })
  const columns = [
    { key: 'name', label: 'Produit', render: (r: any) => <span className="font-semibold text-slate-200">{r.name?.fr || r.name?.en || '—'}</span> },
    { key: 'professional', label: 'Établissement', render: (r: any) => <span className="text-sm text-slate-400">{r.professional?.businessName || '—'}</span> },
    { key: 'price', label: 'Prix', render: (r: any) => <span className="font-black text-brand-green">{formatCFA(r.price)}</span> },
    { key: 'isAvailable', label: 'Dispo', render: (r: any) => <Badge status={r.isAvailable ? 'ACTIVE' : 'SUSPENDED'} label={r.isAvailable ? 'Oui' : 'Non'}/> },
  ]
  return (
    <div className="card p-5">
      <p className="text-sm text-slate-400 mb-4 font-semibold">Catalogue global de tous les établissements partenaires</p>
      <DataTable columns={columns} data={data || []} loading={isLoading}/>
    </div>
  )
}
