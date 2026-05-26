import React, { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import api from '../../services/api'
import { DataTable } from '../../components/ui/DataTable'
import { Badge } from '../../components/ui/Badge'
import { Modal } from '../../components/ui/Modal'
import { LocationPeriodFilters } from '../../components/ui/LocationPeriodFilters'
import { formatCFA, formatDateTime } from '../../utils/format'
import { useFiltersStore } from '../../store/filters'
import { RefreshCw, MapPin, ExternalLink, Truck, CreditCard } from 'lucide-react'

// Tous les statuts intermédiaires regroupés sous "En cours"
const IN_PROGRESS_STATUSES = 'ACCEPTED,IN_PREPARATION,READY_FOR_PICKUP,DRIVER_ASSIGNED,PICKED_UP,IN_DELIVERY'

const statusFilters = [
  { label: 'Toutes',      value: '' },
  { label: 'Nouvelles',   value: 'PAID' },
  { label: 'En cours',    value: IN_PROGRESS_STATUSES },
  { label: 'En livraison',value: 'IN_DELIVERY' },
  { label: 'Livrées',     value: 'DELIVERED' },
  { label: 'Annulées',    value: 'CANCELLED' },
]

/** Résout le nom d'un produit qu'il soit string ou objet i18n `{ fr, en }`. */
const resolveProductName = (name: any): string => {
  if (!name) return 'Produit'
  if (typeof name === 'string') return name
  return name.fr || name.en || Object.values(name)[0] as string || 'Produit'
}

export const Orders: React.FC = () => {
  const [statusFilter, setStatusFilter] = useState('')
  const [selectedOrder, setSelectedOrder] = useState<any>(null)
  const [region, setRegion] = useState('')
  const [city, setCity] = useState('')
  const { country, period, dateFrom, dateTo } = useFiltersStore()

  const { data, isLoading, isFetching, refetch } = useQuery({
    queryKey: ['admin-orders', statusFilter, country, city, period, dateFrom, dateTo],
    queryFn: () => {
      const params = new URLSearchParams({ limit: '100' })
      if (statusFilter) params.set('status', statusFilter)
      if (country)      params.set('country', country)
      if (city)         params.set('city', city)
      if (period === 'custom' && dateFrom) {
        params.set('from', dateFrom)
        if (dateTo) params.set('to', dateTo)
      } else if (period) {
        params.set('period', period)
      }
      return api.get(`/admin/orders?${params}`).then((r: any) => r?.data?.data ?? r?.data ?? [])
    },
    refetchInterval: 15_000,
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
      <LocationPeriodFilters
        region={region} onRegionChange={setRegion}
        city={city}     onCityChange={setCity}
      />

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

      {/* ─── Modal détail commande ────────────────────────────────────────── */}
      <Modal
        open={!!selectedOrder}
        onClose={() => setSelectedOrder(null)}
        title={`Commande #${selectedOrder?.id?.substring(0,8).toUpperCase()}`}
        size="lg"
      >
        {selectedOrder && (
          <div className="space-y-4">

            {/* Ligne 1 — Client / Établissement */}
            <div className="grid grid-cols-2 gap-3">
              <div className="card-sm p-3">
                <div className="text-xs text-slate-500 font-bold mb-1">Client</div>
                <div className="font-bold text-slate-200">{selectedOrder.client?.name || '—'}</div>
                <div className="text-xs text-slate-400">{selectedOrder.client?.phone || '—'}</div>
              </div>
              <div className="card-sm p-3">
                <div className="text-xs text-slate-500 font-bold mb-1">Établissement</div>
                <div className="font-bold text-slate-200">{selectedOrder.professional?.businessName || '—'}</div>
              </div>
            </div>

            {/* Ligne 2 — Livreur / Mode de paiement */}
            <div className="grid grid-cols-2 gap-3">
              <div className="card-sm p-3 flex items-center gap-2">
                <Truck size={14} className="text-teal-400 flex-shrink-0"/>
                <div>
                  <div className="text-xs text-slate-500 font-bold mb-0.5">Livreur</div>
                  <div className="text-sm font-semibold text-slate-300">
                    {selectedOrder.driver?.user?.name || <span className="text-slate-500 italic">Non assigné</span>}
                  </div>
                  {selectedOrder.driver?.user?.phone && (
                    <div className="text-xs text-slate-500">{selectedOrder.driver.user.phone}</div>
                  )}
                </div>
              </div>
              <div className="card-sm p-3 flex items-center gap-2">
                <CreditCard size={14} className="text-purple-400 flex-shrink-0"/>
                <div>
                  <div className="text-xs text-slate-500 font-bold mb-0.5">Paiement</div>
                  <div className="text-sm font-semibold text-slate-300">{selectedOrder.paymentMethod || '—'}</div>
                  <Badge status={selectedOrder.paymentStatus} size="sm"/>
                </div>
              </div>
            </div>

            {/* Adresse de livraison */}
            <div className="card-sm p-3 flex items-center gap-3">
              <MapPin size={16} className="text-brand-green flex-shrink-0"/>
              <span className="text-sm text-slate-300">{selectedOrder.deliveryAddress || '—'}</span>
            </div>

            {/* Articles */}
            {selectedOrder.items?.length > 0 && (
              <div className="card-sm p-3">
                <div className="text-xs text-slate-500 font-bold mb-2">Articles</div>
                {selectedOrder.items.map((item: any, i: number) => (
                  <div key={i} className="flex justify-between text-sm py-1.5 border-b border-navy-700 last:border-0">
                    <span className="text-slate-300">
                      {item.quantity}× {resolveProductName(item.product?.name)}
                    </span>
                    <span className="font-bold text-slate-200">{formatCFA(item.totalPrice)}</span>
                  </div>
                ))}
              </div>
            )}

            {/* Récapitulatif financier */}
            <div className={`grid gap-3 ${selectedOrder.tipAmount > 0 ? 'grid-cols-4' : 'grid-cols-3'}`}>
              <div className="card-sm p-3 text-center">
                <div className="text-xs text-slate-500 font-bold mb-1">Sous-total</div>
                <div className="font-black text-slate-200">{formatCFA(selectedOrder.subtotal)}</div>
              </div>
              <div className="card-sm p-3 text-center">
                <div className="text-xs text-slate-500 font-bold mb-1">Commission</div>
                <div className="font-black text-brand-green">{formatCFA(selectedOrder.commissionAmount)}</div>
              </div>
              {selectedOrder.tipAmount > 0 && (
                <div className="card-sm p-3 text-center border border-yellow-500/30">
                  <div className="text-xs text-yellow-400 font-bold mb-1">Pourboire</div>
                  <div className="font-black text-yellow-300">{formatCFA(selectedOrder.tipAmount)}</div>
                </div>
              )}
              <div className="card-sm p-3 text-center">
                <div className="text-xs text-slate-500 font-bold mb-1">Total</div>
                <div className="font-black text-slate-100">{formatCFA(selectedOrder.totalAmount)}</div>
              </div>
            </div>

            {/* Date de création */}
            <div className="text-xs text-slate-500 text-right font-semibold">
              Créée le {formatDateTime(selectedOrder.createdAt)}
            </div>

          </div>
        )}
      </Modal>
    </div>
  )
}
