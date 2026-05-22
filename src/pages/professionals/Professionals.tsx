import React, { useState, useMemo } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import api from '../../services/api'
import { DataTable } from '../../components/ui/DataTable'
import { Badge } from '../../components/ui/Badge'
import { Modal } from '../../components/ui/Modal'
import { LocationPeriodFilters } from '../../components/ui/LocationPeriodFilters'
import { ReferralTab } from '../../components/ui/ReferralTab'
import { formatDateTime, formatDate, formatCFA } from '../../utils/format'
import { useFiltersStore } from '../../store/filters'
import { useConfirm } from '../../hooks/useConfirm'
import {
  CheckCircle, XCircle, AlertTriangle, Building2, Phone, Mail, MapPin, FileText,
  ShoppingCart, ChevronDown, ChevronRight, Eye, Plus, Edit2, Trash2,
  Tag, ToggleLeft, ToggleRight,
} from 'lucide-react'
import toast from 'react-hot-toast'

const CATEGORIES = [
  { value: '', label: 'Toutes catégories' },
  { value: 'RESTAURANT',  label: 'Restaurant' },
  { value: 'GROCERY',     label: 'Épicerie' },
  { value: 'SUPERMARKET', label: 'Supermarché' },
  { value: 'BAKERY',      label: 'Boulangerie' },
  { value: 'PHARMACY',    label: 'Pharmacie' },
  { value: 'OTHER',       label: 'Autre' },
]

const PROMO_TYPES = [
  { value: 'PERCENTAGE',    label: 'Réduction %' },
  { value: 'FIXED',         label: 'Réduction fixe (XOF)' },
  { value: 'BOGO',          label: '1 acheté = 1 offert' },
  { value: 'THREE_FOR_TWO', label: '3 pour le prix de 2' },
]

const COUNTRIES_LIST = [
  { code: 'BJ', name: 'Bénin',         currency: 'XOF' },
  { code: 'SN', name: 'Sénégal',       currency: 'XOF' },
  { code: 'CI', name: "Côte d'Ivoire", currency: 'XOF' },
  { code: 'TG', name: 'Togo',          currency: 'XOF' },
]

// ─── Formulaire Professionnel ──────────────────────────────────────────────────
interface ProFormProps {
  initial?: any
  onSubmit: (data: any) => void
  loading: boolean
}

const ProForm: React.FC<ProFormProps> = ({ initial, onSubmit, loading }) => {
  const isEdit = !!initial
  const [form, setForm] = useState({
    businessName: initial?.businessName ?? '',
    category:     initial?.category     ?? 'RESTAURANT',
    city:         initial?.city         ?? '',
    country:      initial?.country      ?? 'BJ',
    address:      initial?.address      ?? '',
    phone:        initial?.phone        ?? '',
    email:        initial?.email        ?? '',
    description:  initial?.description  ?? '',
    commissionRate:   initial?.commissionRate   ?? '',
    deliveryRadiusKm: initial?.deliveryRadiusKm ?? '10',
    // Owner fields (create only)
    ownerPhone:     '',
    ownerFirstName: '',
    ownerName:      '',
    ownerEmail:     '',
  })

  const set = (k: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
    setForm(f => ({ ...f, [k]: e.target.value }))

  return (
    <div className="space-y-3 max-h-[70vh] overflow-y-auto pr-1">
      <div className="text-xs font-bold text-slate-500 uppercase tracking-wider">Établissement</div>
      <div className="grid grid-cols-2 gap-3">
        <div className="col-span-2">
          <label className="label">Nom de l'établissement *</label>
          <input className="input w-full" value={form.businessName} onChange={set('businessName')} placeholder="ex: Chez Maman"/>
        </div>
        <div>
          <label className="label">Catégorie *</label>
          <select className="input w-full appearance-none cursor-pointer" value={form.category} onChange={set('category')}>
            {CATEGORIES.filter(c => c.value).map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
          </select>
        </div>
        <div>
          <label className="label">Pays *</label>
          <select className="input w-full appearance-none cursor-pointer" value={form.country} onChange={set('country')}>
            {COUNTRIES_LIST.map(c => <option key={c.code} value={c.code}>{c.name}</option>)}
          </select>
        </div>
        <div>
          <label className="label">Ville *</label>
          <input className="input w-full" value={form.city} onChange={set('city')} placeholder="Cotonou"/>
        </div>
        <div>
          <label className="label">Téléphone pro</label>
          <input className="input w-full font-mono" value={form.phone} onChange={set('phone')} placeholder="+22901020304"/>
        </div>
        <div className="col-span-2">
          <label className="label">Adresse *</label>
          <input className="input w-full" value={form.address} onChange={set('address')} placeholder="123 rue du marché"/>
        </div>
        <div>
          <label className="label">Commission (%)</label>
          <input className="input w-full" type="number" min="0" max="100" value={form.commissionRate} onChange={set('commissionRate')} placeholder="10"/>
        </div>
        <div>
          <label className="label">Rayon livraison (km)</label>
          <input className="input w-full" type="number" min="1" value={form.deliveryRadiusKm} onChange={set('deliveryRadiusKm')}/>
        </div>
      </div>

      {!isEdit && (
        <>
          <div className="text-xs font-bold text-slate-500 uppercase tracking-wider pt-2">Propriétaire (nouveau compte)</div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">Prénom</label>
              <input className="input w-full" value={form.ownerFirstName} onChange={set('ownerFirstName')}/>
            </div>
            <div>
              <label className="label">Nom</label>
              <input className="input w-full" value={form.ownerName} onChange={set('ownerName')}/>
            </div>
            <div className="col-span-2">
              <label className="label">Téléphone *</label>
              <input className="input w-full font-mono" value={form.ownerPhone} onChange={set('ownerPhone')} placeholder="+22901020304"/>
            </div>
          </div>
        </>
      )}

      <button
        onClick={() => {
          if (!form.businessName.trim()) { toast.error('Nom requis'); return }
          if (!form.city.trim())         { toast.error('Ville requise'); return }
          if (!form.address.trim())      { toast.error('Adresse requise'); return }
          if (!isEdit && !form.ownerPhone.trim()) { toast.error('Téléphone du propriétaire requis'); return }
          onSubmit({
            ...form,
            commissionRate:   form.commissionRate   ? Number(form.commissionRate)   : undefined,
            deliveryRadiusKm: form.deliveryRadiusKm ? Number(form.deliveryRadiusKm) : undefined,
          })
        }}
        disabled={loading}
        className="btn-primary w-full justify-center">
        {loading ? 'Enregistrement…' : isEdit ? 'Enregistrer' : 'Créer l\'établissement'}
      </button>
    </div>
  )
}

// ─── Onglet Promotions ────────────────────────────────────────────────────────
const PromotionsTab: React.FC<{ proId: string }> = ({ proId }) => {
  const qc = useQueryClient()
  const [showCreate, setShowCreate] = useState(false)
  const [editPromo, setEditPromo] = useState<any>(null)
  const [form, setForm] = useState({ code: '', type: 'PERCENTAGE', value: '', minOrder: '', maxUses: '', expiresAt: '' })

  const { data, isLoading } = useQuery({
    queryKey: ['pro-promo-codes', proId],
    queryFn: () => api.get(`/admin/professionals/${proId}/promo-codes`).then((r: any) => r?.data?.data ?? r?.data ?? []),
    enabled: !!proId,
  })

  const promos: any[] = Array.isArray(data) ? data : []

  const resetForm = () => setForm({ code: '', type: 'PERCENTAGE', value: '', minOrder: '', maxUses: '', expiresAt: '' })

  const createMutation = useMutation({
    mutationFn: (dto: any) => api.post('/admin/promo-codes', dto),
    onSuccess: () => { toast.success('Promotion créée !'); qc.invalidateQueries({ queryKey: ['pro-promo-codes', proId] }); setShowCreate(false); resetForm() },
    onError: (e: any) => toast.error(e.message),
  })

  const updateMutation = useMutation({
    mutationFn: ({ id, dto }: { id: string; dto: any }) => api.patch(`/admin/promo-codes/${id}`, dto),
    onSuccess: () => { toast.success('Promotion mise à jour'); qc.invalidateQueries({ queryKey: ['pro-promo-codes', proId] }); setEditPromo(null) },
    onError: (e: any) => toast.error(e.message),
  })

  const toggleMutation = useMutation({
    mutationFn: (id: string) => api.patch(`/admin/promo-codes/${id}/toggle`, {}),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['pro-promo-codes', proId] }),
    onError: (e: any) => toast.error(e.message),
  })

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.delete(`/admin/promo-codes/${id}`),
    onSuccess: () => { toast.success('Supprimé'); qc.invalidateQueries({ queryKey: ['pro-promo-codes', proId] }) },
    onError: (e: any) => toast.error(e.message),
  })

  const handleSubmit = (isEdit: boolean) => {
    if (!form.code.trim()) { toast.error('Code requis'); return }
    const needsValue = form.type === 'PERCENTAGE' || form.type === 'FIXED'
    if (needsValue && !form.value) { toast.error('Valeur requise pour ce type'); return }
    const dto = {
      code: form.code.trim().toUpperCase(),
      type: form.type,
      value: Number(form.value) || 0,
      minOrder: Number(form.minOrder) || 0,
      maxUses: form.maxUses ? Number(form.maxUses) : null,
      expiresAt: form.expiresAt || null,
      professionalId: proId,
      countries: [],
    }
    if (isEdit) {
      updateMutation.mutate({ id: editPromo.id, dto })
    } else {
      createMutation.mutate(dto)
    }
  }

  const PromoForm = ({ isEdit }: { isEdit: boolean }) => (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="label">Code *</label>
          <input className="input w-full font-mono uppercase" value={form.code} onChange={e => setForm(f => ({ ...f, code: e.target.value.toUpperCase() }))} placeholder="PROMO10"/>
        </div>
        <div>
          <label className="label">Type *</label>
          <select className="input w-full appearance-none cursor-pointer" value={form.type} onChange={e => setForm(f => ({ ...f, type: e.target.value }))}>
            {PROMO_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
          </select>
        </div>
        {(form.type === 'PERCENTAGE' || form.type === 'FIXED') && (
          <div>
            <label className="label">{form.type === 'PERCENTAGE' ? 'Valeur (%)' : 'Montant (XOF)'}</label>
            <input className="input w-full" type="number" min="0" value={form.value} onChange={e => setForm(f => ({ ...f, value: e.target.value }))}/>
          </div>
        )}
        <div>
          <label className="label">Commande min. (XOF)</label>
          <input className="input w-full" type="number" min="0" value={form.minOrder} onChange={e => setForm(f => ({ ...f, minOrder: e.target.value }))}/>
        </div>
        <div>
          <label className="label">Utilisations max</label>
          <input className="input w-full" type="number" min="1" value={form.maxUses} onChange={e => setForm(f => ({ ...f, maxUses: e.target.value }))} placeholder="Illimité"/>
        </div>
        <div>
          <label className="label">Expiration</label>
          <input className="input w-full" type="date" value={form.expiresAt} onChange={e => setForm(f => ({ ...f, expiresAt: e.target.value }))}/>
        </div>
      </div>
      <div className="flex gap-2">
        <button onClick={() => { if (isEdit) setEditPromo(null); else setShowCreate(false); resetForm() }}
          className="btn-secondary flex-1 justify-center">Annuler</button>
        <button onClick={() => handleSubmit(isEdit)}
          disabled={createMutation.isPending || updateMutation.isPending}
          className="btn-primary flex-1 justify-center">
          {isEdit ? 'Enregistrer' : 'Créer'}
        </button>
      </div>
    </div>
  )

  if (isLoading) return <div className="flex justify-center py-10"><div className="w-6 h-6 border-2 border-brand-green border-t-transparent rounded-full animate-spin"/></div>

  return (
    <div className="space-y-4">
      {!showCreate && !editPromo && (
        <button onClick={() => setShowCreate(true)} className="btn-primary text-sm">
          <Plus size={14}/> Nouvelle promotion
        </button>
      )}

      {showCreate && <div className="card-sm p-4"><div className="text-xs font-bold text-slate-400 mb-3">Nouvelle promotion</div><PromoForm isEdit={false}/></div>}

      {editPromo && <div className="card-sm p-4"><div className="text-xs font-bold text-slate-400 mb-3">Modifier — {editPromo.code}</div><PromoForm isEdit={true}/></div>}

      {promos.length === 0 && !showCreate
        ? <div className="text-center py-8 text-slate-500 text-sm">Aucune promotion créée</div>
        : (
          <div className="space-y-2">
            {promos.map((p: any) => {
              const typeLabel = PROMO_TYPES.find(t => t.value === p.type)?.label ?? p.type
              const valueDisplay = p.type === 'PERCENTAGE' ? `${p.value}%`
                : p.type === 'FIXED' ? formatCFA(p.value)
                : '—'
              return (
                <div key={p.id} className="card-sm p-3 flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2 min-w-0">
                    <Tag size={14} className="text-brand-green flex-shrink-0"/>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-black text-sm text-slate-100 font-mono">{p.code}</span>
                        {!p.isActive && <span className="text-[10px] bg-red-500/15 text-red-400 px-1.5 py-0.5 rounded-md font-bold">INACTIF</span>}
                      </div>
                      <div className="text-xs text-slate-500">{typeLabel}{valueDisplay !== '—' ? ` · ${valueDisplay}` : ''} · {p.usesCount} util.</div>
                    </div>
                  </div>
                  <div className="flex gap-1 flex-shrink-0">
                    <button onClick={() => {
                      setEditPromo(p)
                      setForm({ code: p.code, type: p.type, value: String(p.value), minOrder: String(p.minOrder || ''), maxUses: String(p.maxUses || ''), expiresAt: p.expiresAt ? p.expiresAt.slice(0,10) : '' })
                      setShowCreate(false)
                    }} className="p-1.5 text-slate-400 hover:text-white hover:bg-navy-700 rounded-lg"><Edit2 size={13}/></button>
                    <button onClick={() => toggleMutation.mutate(p.id)}
                      className={`p-1.5 rounded-lg ${p.isActive ? 'text-green-400 hover:bg-green-500/10' : 'text-slate-500 hover:bg-navy-700'}`}>
                      {p.isActive ? <ToggleRight size={14}/> : <ToggleLeft size={14}/>}
                    </button>
                    <button onClick={() => deleteMutation.mutate(p.id)}
                      className="p-1.5 text-red-400 hover:bg-red-500/10 rounded-lg"><Trash2 size={13}/></button>
                  </div>
                </div>
              )
            })}
          </div>
        )
      }
    </div>
  )
}

// ─── Page principale ──────────────────────────────────────────────────────────
export const Professionals: React.FC = () => {
  const [tab, setTab] = useState<'pending' | 'active' | 'all'>('all')
  const [categoryFilter, setCategoryFilter] = useState('')
  const [region, setRegion] = useState('')
  const [city, setCity] = useState('')
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [detailTab, setDetailTab] = useState<'info' | 'edit' | 'catalogue' | 'orders' | 'promotions' | 'referral'>('info')
  const [rejectNote, setRejectNote] = useState('')
  const [openCats, setOpenCats] = useState<Set<string>>(new Set())
  const [showCreateModal, setShowCreateModal] = useState(false)
  const { country } = useFiltersStore()
  const qc = useQueryClient()
  const confirm = useConfirm()

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

  const { data: allPros = [], isLoading: allLoading, isFetching, refetch } = useQuery({
    queryKey: ['all-professionals', country, city, categoryFilter],
    queryFn: () => {
      const params = new URLSearchParams()
      if (country)        params.set('country', country)
      if (city)           params.set('city', city)
      if (categoryFilter) params.set('category', categoryFilter)
      return api.get(`/admin/professionals${params.toString() ? '?' + params : ''}`).then((r: any) => r?.data?.data ?? r?.data ?? [])
    },
  })

  const unwrap = (r: any) => r?.data?.data ?? r?.data ?? r

  const { data: proDetail } = useQuery({
    queryKey: ['pro-detail', selectedId],
    queryFn: () => api.get(`/admin/professionals/${selectedId}`).then(unwrap),
    enabled: !!selectedId,
  })

  const { data: catalogueData } = useQuery({
    queryKey: ['pro-catalogue', selectedId],
    queryFn: () => api.get(`/admin/catalogue/${selectedId}`).then(unwrap),
    enabled: !!selectedId && detailTab === 'catalogue',
  })

  const { data: ordersData } = useQuery({
    queryKey: ['pro-orders', selectedId],
    queryFn: () => api.get(`/admin/professionals/${selectedId}/orders`).then(unwrap),
    enabled: !!selectedId && detailTab === 'orders',
  })

  // Compteurs dynamiques côté client
  const activePros = useMemo(() => (allPros as any[]).filter((p: any) => p.status === 'VALIDATED'), [allPros])
  const displayedPros = useMemo(() => {
    if (tab === 'pending') return pending
    if (tab === 'active')  return activePros
    return allPros as any[]
  }, [tab, pending, activePros, allPros])

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

  const createMutation = useMutation({
    mutationFn: (dto: any) => api.post('/admin/professionals', dto).then(unwrap),
    onSuccess: () => {
      toast.success('Établissement créé !')
      qc.invalidateQueries({ queryKey: ['all-professionals'] })
      setShowCreateModal(false)
    },
    onError: (e: any) => toast.error(e.message),
  })

  const updateMutation = useMutation({
    mutationFn: (dto: any) => api.patch(`/admin/professionals/${selectedId}/info`, dto).then(unwrap),
    onSuccess: () => {
      toast.success('Établissement mis à jour')
      qc.invalidateQueries({ queryKey: ['all-professionals'] })
      qc.invalidateQueries({ queryKey: ['pro-detail', selectedId] })
      setDetailTab('info')
    },
    onError: (e: any) => toast.error(e.message),
  })

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.delete(`/admin/professionals/${id}`),
    onSuccess: () => {
      toast.success('Établissement supprimé')
      qc.invalidateQueries({ queryKey: ['all-professionals'] })
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
      render: (r: any) => <span className="text-xs font-bold text-slate-400 bg-navy-700 px-2 py-1 rounded-lg">{CATEGORIES.find(c => c.value === r.category)?.label ?? r.category ?? '—'}</span> },
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
          <button title="Voir" onClick={() => openDetail(r)}
            className="p-1.5 text-blue-400 hover:bg-blue-500/10 rounded-lg transition-colors"><Eye size={14}/></button>
          <button title="Valider" onClick={async () => {
            const ok = await confirm({ title: 'Valider cet établissement ?', message: `${r.businessName} pourra publier son catalogue.`, variant: 'info', confirmLabel: 'Valider' })
            if (ok) validateMutation.mutate({ id: r.id, status: 'VALIDATED' })
          }} className="p-1.5 text-green-400 hover:bg-green-500/10 rounded-lg transition-colors"><CheckCircle size={14}/></button>
          <button title="Refuser" onClick={() => openDetail(r)}
            className="p-1.5 text-red-400 hover:bg-red-500/10 rounded-lg transition-colors"><XCircle size={14}/></button>
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
      <LocationPeriodFilters
        region={region} onRegionChange={setRegion}
        city={city}     onCityChange={setCity}
        onRefresh={() => refetch()}
        isRefreshing={isFetching}
      />

      {/* Catégorie + tabs */}
      <div className="flex items-center gap-3 flex-wrap">
        <select value={categoryFilter} onChange={e => setCategoryFilter(e.target.value)}
          className="input h-9 text-sm pr-8 appearance-none cursor-pointer">
          {CATEGORIES.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
        </select>

        <div className="flex gap-1.5">
          {([
            { key: 'pending', label: 'En attente',    count: (pending as any[]).length },
            { key: 'active',  label: 'Actifs',        count: activePros.length },
            { key: 'all',     label: 'Tous les pros', count: (allPros as any[]).length },
          ] as const).map(t => (
            <button key={t.key} onClick={() => setTab(t.key)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${tab === t.key ? 'bg-brand-green text-white' : 'bg-navy-800 text-slate-400 border border-navy-600 hover:text-slate-200'}`}>
              {t.label}
              <span className={`text-[10px] font-black px-1.5 py-0.5 rounded-full ${tab === t.key ? 'bg-white/20' : 'bg-navy-700'}`}>{t.count}</span>
            </button>
          ))}
        </div>
      </div>

      {pending.length > 0 && tab !== 'pending' && (
        <div className="flex items-center gap-3 p-3 bg-yellow-500/10 border border-yellow-500/30 rounded-xl">
          <AlertTriangle size={16} className="text-yellow-400 flex-shrink-0"/>
          <span className="text-sm font-bold text-yellow-400">
            {(pending as any[]).length} inscription{(pending as any[]).length > 1 ? 's' : ''} en attente
          </span>
          <button onClick={() => setTab('pending')} className="ml-auto text-xs text-yellow-400 underline font-bold">Voir</button>
        </div>
      )}

      <div className="card p-5">
        <DataTable
          columns={tab === 'pending' ? pendingColumns : baseColumns}
          data={displayedPros}
          loading={tab === 'all' || tab === 'active' ? allLoading : pendingLoading}
          onRowClick={openDetail}
          exportable
          exportFilename={tab === 'pending' ? 'pros-en-attente' : tab === 'active' ? 'pros-actifs' : 'professionnels'}
          toolbar={
            <button onClick={() => setShowCreateModal(true)} className="btn-primary text-xs px-3 h-9">
              <Plus size={14}/> Nouvel établissement
            </button>
          }
        />
      </div>

      {/* Modal Créer */}
      <Modal open={showCreateModal} onClose={() => setShowCreateModal(false)} title="Créer un établissement" size="lg">
        <ProForm onSubmit={(dto) => createMutation.mutate(dto)} loading={createMutation.isPending}/>
      </Modal>

      {/* Modal Détail */}
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
                  <div className="text-sm text-slate-400">{CATEGORIES.find(c => c.value === selected.category)?.label ?? selected.category} · {selected.city}, {selected.country}</div>
                </div>
              </div>
              <Badge status={selected.status || 'PENDING'}/>
            </div>

            {/* Validation rapide si PENDING */}
            {selected.status === 'PENDING' && (
              <div className="p-4 bg-yellow-500/10 border border-yellow-500/30 rounded-xl space-y-3">
                <div className="text-sm font-bold text-yellow-400">Dossier en attente de validation</div>
                <textarea value={rejectNote} onChange={e => setRejectNote(e.target.value)}
                  className="input h-16 resize-none text-sm" placeholder="Note de refus (optionnel)…"/>
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
            <div className="flex gap-1 border-b border-navy-700 overflow-x-auto">
              {([
                { key: 'info',       label: 'Informations' },
                { key: 'edit',       label: 'Modifier' },
                { key: 'catalogue',  label: 'Catalogue' },
                { key: 'orders',     label: 'Commandes' },
                { key: 'promotions', label: 'Promotions' },
                { key: 'referral',   label: 'Parrainage' },
              ] as const).map(({ key, label }) => (
                <button key={key} onClick={() => setDetailTab(key)}
                  className={`px-4 py-2 text-sm font-bold border-b-2 -mb-px transition-all whitespace-nowrap ${detailTab === key ? 'border-brand-green text-brand-green' : 'border-transparent text-slate-400 hover:text-slate-200'}`}>
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
                <button onClick={async () => {
                  const ok = await confirm({ title: 'Supprimer cet établissement ?', message: `${selected.businessName} sera banni et le compte propriétaire désactivé. Action irréversible.`, variant: 'danger', confirmLabel: 'Supprimer' })
                  if (ok) deleteMutation.mutate(selected.id)
                }} disabled={deleteMutation.isPending} className="btn-danger text-sm justify-center w-full">
                  <Trash2 size={14}/> Supprimer l'établissement
                </button>
              </div>
            )}

            {/* Onglet : Modifier */}
            {detailTab === 'edit' && (
              <ProForm
                initial={selected}
                onSubmit={(dto) => updateMutation.mutate(dto)}
                loading={updateMutation.isPending}
              />
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
                            <button onClick={() => toggleCat(cat.id)}
                              className="w-full flex items-center justify-between p-3 text-left hover:bg-navy-700/50 transition-colors">
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
                                    <div className="text-xs text-slate-500">{formatDate(o.createdAt)}</div>
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

            {/* Onglet : Promotions */}
            {detailTab === 'promotions' && <PromotionsTab proId={selected.id}/>}

            {/* Onglet : Parrainage */}
            {detailTab === 'referral' && selected.userId && (
              <ReferralTab userId={selected.userId}/>
            )}
          </div>
        ) : (
          <div className="flex justify-center py-10"><div className="w-6 h-6 border-2 border-brand-green border-t-transparent rounded-full animate-spin"/></div>
        )}
      </Modal>
    </div>
  )
}
