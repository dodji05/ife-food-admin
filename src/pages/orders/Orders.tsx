import React, { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import api from '../../services/api'
import { DataTable } from '../../components/ui/DataTable'
import { Badge } from '../../components/ui/Badge'
import { Modal } from '../../components/ui/Modal'
import { LocationPeriodFilters } from '../../components/ui/LocationPeriodFilters'
import { formatCFA, formatDateTime } from '../../utils/format'
import { useFiltersStore } from '../../store/filters'
import { RefreshCw, MapPin, ExternalLink } from 'lucide-react'
import toast from 'react-hot-toast'

const statusFilters = [
  { label: 'Toutes', value: '' },
  { label: 'Nouvelles', value: 'PAID' },
  { label: 'En cours', value: 'IN_PREPARATION' },
  { label: 'En livraison', value: 'IN_DELIVERY' },
  { label: 'Livrées', value: 'DELIVERED' },
  { label: 'Annulées', value: 'CANCELLED' },
]

export const Orders: React.FC = () => {
  const [statusFilter, setStatusFilter] = useState('')
  const [selectedOrder, setSelectedOrder] = useState<any>(null)
  const [region, setRegion] = useState('')
  const [city, setCity] = useState('')
  const qc = useQueryClient()
  const { country, period } = useFiltersStore()

  const { data, isLoading, isFetching, refetch } = useQuery({
    queryKey: ['admin-orders', statusFilter, country, city, period],
    queryFn: () => {
      const params = new URLSearchParams()
      if (statusFilter) params.set('status', statusFilter)
      if (country)      params.set('country', country)
      if (city)         params.set('city', city)
      if (period)       params.set('period', period)
      const qs = params.toString()
      return api.get(`/admin/orders${qs ? `?${qs}` : ''}`).then((r: any) => r?.data?.data ?? r?.data ?? [])
    },
    refetchInterval: 15000,
  })

  const reassignMutation = useMutation({
    mutationFn: ({ orderId, driverId }: { orderId: string; driverId: string }) =>
      api.patch(`/admin/orders/${orderId}/reassign`, { driverId }),
    onSuccess: () => { toast.success('Livreur réassigné !'); qc.invalidateQueries({ queryKey: ['admin-orders'] }) },
    onError: (e: any) => toast.error(e.message),
  })

  const columns = [
    { key: 'id', label: 'ID', width: '120px',
      exportValue: (r: any) => r.id,
      render: (r: any) => <span className="text-xs font-black text-slate-400">#{r.id?.substring(0,8).toUpperCase()}</span> },
    { key: 'client', label: 'Client',
      sortable: true,
      sortValue: (r: any) => (r.client?.name ?? '').toLowerCase(),
      exportValue: (r: any) => `${r.client?.name ?? ''} ${r.client?.phone ? '(' + r.client.phone + ')' : ''}`.trim(),
      render: (r: any) => (
      <div className="flex items-center gap-2">
        <div className="w-7 h-7 rounded-full bg-brand-green/20 border border-brand-green/30 flex items-center justify-center flex-shrink-0">
          <span className="text-brand-green font-black text-[10px]">{(r.client?.name || 'C')[0].toUpperCase()}</span>
        </div>
        <div>
          <div className="text-sm font-semibold text-slate-200">{r.client?.name || 'Client'}</div>
          <div className="text-xs text-slate-500">{r.client?.phone || '—'}</div>
        </div>
      </div>
    )},
    { key: 'professional', label: 'Établissement',
      sortable: true, hideOnMobile: true,
      sortValue: (r: any) => (r.professional?.businessName ?? '').toLowerCase(),
      exportValue: (r: any) => r.professional?.businessName ?? '',
      render: (r: any) => <span className="text-sm text-slate-300 font-medium">{r.professional?.businessName || '—'}</span> },
    { key: 'status', label: 'Statut',
      sortable: true,
      exportValue: (r: any) => r.status,
      render: (r: any) => <Badge status={r.status}/> },
    { key: 'totalAmount', label: 'Montant',
      sortable: true,
      sortValue: (r: any) => Number(r.totalAmount) || 0,
      exportValue: (r: any) => r.totalAmount,
      render: (r: any) => <span className="font-black text-brand-green">{formatCFA(r.totalAmount)}</span> },
    { key: 'paymentStatus', label: 'Paiement',
      sortable: true, hideOnMobile: true,
      exportValue: (r: any) => r.paymentStatus,
      render: (r: any) => <Badge status={r.paymentStatus}/> },
    { key: 'createdAt', label: 'Date',
      sortable: true, hideOnMobile: true,
      sortValue: (r: any) => r.createdAt ? new Date(r.createdAt).getTime() : 0,
      exportValue: (r: any) => r.createdAt,
      render: (r: any) => <span className="text-xs text-slate-400">{formatDateTime(r.createdAt)}</span> },
    { key: 'actions', label: '', width: '40px', render: (r: any) => (
      <button onClick={(e) => { e.stopPropagation(); setSelectedOrder(r) }} className="p-1.5 text-slate-400 hover:text-white hover:bg-navy-700 rounded-lg">
        <ExternalLink size={14}/>
      </button>
    )},
  ]

  return (
    <div className="space-y-5">
      {/* Bloc filtres globaux (pays / région / ville / période + reset) */}
      <LocationPeriodFilters
        region={region} onRegionChange={setRegion}
        city={city}     onCityChange={setCity}
      />

      {/* Filtres statut existants + Actualiser (conservés) */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div className="flex gap-1.5 flex-wrap">
          {statusFilters.map(f => (
            <button key={f.value} onClick={() => setStatusFilter(f.value)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${statusFilter === f.value ? 'bg-brand-green text-white' : 'bg-navy-800 text-slate-400 hover:text-slate-200 border border-navy-600'}`}>
              {f.label}
            </button>
          ))}
        </div>
        <button onClick={() => refetch()} disabled={isFetching} className="btn-secondary disabled:opacity-50">
          <RefreshCw size={14} className={isFetching ? 'animate-spin' : ''}/> Actualiser
        </button>
      </div>

      <div className="card p-5">
        <DataTable
          columns={columns}
          data={data || []}
          loading={isLoading}
          onRowClick={setSelectedOrder}
          exportable
          exportFilename="commandes"
        />
      </div>

      <Modal open={!!selectedOrder} onClose={() => setSelectedOrder(null)} title={`Commande #${selectedOrder?.id?.substring(0,8).toUpperCase()}`} size="lg">
        {selectedOrder && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="card-sm p-3">
                <div className="text-xs text-slate-500 font-bold mb-1">Client</div>
                <div className="font-bold text-slate-200">{selectedOrder.client?.name || '—'}</div>
                <div className="text-xs text-slate-400">{selectedOrder.client?.phone}</div>
              </div>
              <div className="card-sm p-3">
                <div className="text-xs text-slate-500 font-bold mb-1">Établissement</div>
                <div className="font-bold text-slate-200">{selectedOrder.professional?.businessName || '—'}</div>
              </div>
            </div>
            <div className="card-sm p-3 flex items-center gap-3">
              <MapPin size={16} className="text-brand-green flex-shrink-0"/>
              <span className="text-sm text-slate-300">{selectedOrder.deliveryAddress}</span>
            </div>
            {selectedOrder.items?.length > 0 && (
              <div className="card-sm p-3">
                <div className="text-xs text-slate-500 font-bold mb-2">Articles</div>
                {selectedOrder.items.map((item: any, i: number) => (
                  <div key={i} className="flex justify-between text-sm py-1.5 border-b border-navy-700 last:border-0">
                    <span className="text-slate-300">{item.quantity}× {item.product?.name?.fr || 'Produit'}</span>
                    <span className="font-bold text-slate-200">{formatCFA(item.totalPrice)}</span>
                  </div>
                ))}
              </div>
            )}
            <div className="grid grid-cols-3 gap-3">
              <div className="card-sm p-3 text-center">
                <div className="text-xs text-slate-500 font-bold mb-1">Sous-total</div>
                <div className="font-black text-slate-200">{formatCFA(selectedOrder.subtotal)}</div>
              </div>
              <div className="card-sm p-3 text-center">
                <div className="text-xs text-slate-500 font-bold mb-1">Commission</div>
                <div className="font-black text-brand-green">{formatCFA(selectedOrder.commissionAmount)}</div>
              </div>
              <div className="card-sm p-3 text-center">
                <div className="text-xs text-slate-500 font-bold mb-1">Total</div>
                <div className="font-black text-slate-100">{formatCFA(selectedOrder.totalAmount)}</div>
              </div>
            </div>
          </div>
        )}
      </Modal>
    </div>
  )
}
