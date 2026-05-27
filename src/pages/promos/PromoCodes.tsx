import React, { useState, useMemo } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import api from '../../services/api'
import { DataTable } from '../../components/ui/DataTable'
import { useConfirm } from '../../hooks/useConfirm'
import { Modal } from '../../components/ui/Modal'
import { formatDate, formatCFA } from '../../utils/format'
import { COUNTRIES } from '../../constants/countries'
import { Plus, Pencil, Trash2, ToggleLeft, ToggleRight } from 'lucide-react'
import toast from 'react-hot-toast'

interface PromoCode {
  id: string
  code: string
  type: 'PERCENTAGE' | 'FIXED_AMOUNT'
  value: number
  minOrder: number
  maxUses: number | null
  usesCount: number
  perUser: boolean
  expiresAt: string | null
  countries: string[]
  isActive: boolean
  createdAt: string
  professionalId: string | null
  productId: string | null
  professional?: { id: string; businessName: string } | null
  product?: { id: string; name: any } | null
}

const EMPTY_FORM = {
  code: '',
  type: 'PERCENTAGE' as 'PERCENTAGE' | 'FIXED_AMOUNT',
  value: '',
  minOrder: '0',
  maxUses: '',
  perUser: false,
  expiresAt: '',
  countries: [] as string[],
  professionalId: '',
  productId: '',
}


const resolveName = (name: any): string => {
  if (!name) return '—'
  if (typeof name === 'string') return name
  return name.fr || name.en || Object.values(name)[0] as string || '—'
}

export const PromoCodes: React.FC = () => {
  const qc = useQueryClient()
  const confirm = useConfirm()
  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState<PromoCode | null>(null)
  const [form, setForm] = useState({ ...EMPTY_FORM })

  const { data: codes = [], isLoading } = useQuery({
    queryKey: ['promo-codes'],
    queryFn: () => api.get('/admin/promo-codes').then((r: any) => {
      if (Array.isArray(r)) return r
      if (Array.isArray(r?.data?.data)) return r.data.data
      if (Array.isArray(r?.data)) return r.data
      return []
    }),
  })

  // Professionals pour le select
  const { data: pros = [] } = useQuery({
    queryKey: ['all-professionals-selector'],
    queryFn: () => api.get('/admin/professionals?limit=500').then((r: any) => r?.data?.data ?? r?.data ?? []),
    staleTime: 5 * 60 * 1000,
  })

  // Produits du pro sélectionné
  const { data: proProducts = [] } = useQuery({
    queryKey: ['promo-pro-products', form.professionalId],
    queryFn: () => api.get(`/admin/catalogue/${form.professionalId}`).then((r: any) => {
      const d = r?.data?.data ?? r?.data
      const cats: any[] = d?.categories ?? []
      return cats.flatMap((c: any) => c.products ?? [])
    }),
    enabled: !!form.professionalId,
    staleTime: 30_000,
  })

  const createMutation = useMutation({
    mutationFn: (dto: any) => api.post('/admin/promo-codes', dto),
    onSuccess: () => { toast.success('Code promo créé'); qc.invalidateQueries({ queryKey: ['promo-codes'] }); closeModal() },
    onError: (e: any) => toast.error(e.message),
  })

  const updateMutation = useMutation({
    mutationFn: ({ id, dto }: { id: string; dto: any }) => api.patch(`/admin/promo-codes/${id}`, dto),
    onSuccess: () => { toast.success('Code promo mis à jour'); qc.invalidateQueries({ queryKey: ['promo-codes'] }); closeModal() },
    onError: (e: any) => toast.error(e.message),
  })

  const toggleMutation = useMutation({
    mutationFn: (id: string) => api.patch(`/admin/promo-codes/${id}/toggle`, {}),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['promo-codes'] }),
    onError: (e: any) => toast.error(e.message),
  })

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.delete(`/admin/promo-codes/${id}`),
    onSuccess: () => { toast.success('Code supprimé'); qc.invalidateQueries({ queryKey: ['promo-codes'] }) },
    onError: (e: any) => toast.error(e.message),
  })

  const openCreate = () => {
    setEditing(null)
    setForm({ ...EMPTY_FORM })
    setModalOpen(true)
  }

  const openEdit = (c: PromoCode) => {
    setEditing(c)
    setForm({
      code: c.code,
      type: c.type,
      value: String(c.value),
      minOrder: String(c.minOrder ?? 0),
      maxUses: c.maxUses != null ? String(c.maxUses) : '',
      perUser: c.perUser,
      expiresAt: c.expiresAt ? c.expiresAt.slice(0, 10) : '',
      countries: c.countries ?? [],
      professionalId: c.professionalId ?? '',
      productId: c.productId ?? '',
    })
    setModalOpen(true)
  }

  const closeModal = () => { setModalOpen(false); setEditing(null) }

  const handleProChange = (proId: string) => {
    setForm(f => ({ ...f, professionalId: proId, productId: '' }))
  }

  const handleSubmit = () => {
    if (!form.code.trim()) return toast.error('Code requis')
    if (!form.value || isNaN(Number(form.value))) return toast.error('Valeur invalide')
    const dto = {
      code: form.code.trim().toUpperCase(),
      type: form.type,
      value: Number(form.value),
      minOrder: Number(form.minOrder || 0),
      maxUses: form.maxUses ? Number(form.maxUses) : null,
      perUser: form.perUser,
      expiresAt: form.expiresAt || null,
      countries: form.countries,
      professionalId: form.professionalId || null,
      productId: form.productId || null,
    }
    if (editing) updateMutation.mutate({ id: editing.id, dto })
    else createMutation.mutate(dto)
  }



  const isPending = createMutation.isPending || updateMutation.isPending

  const columns = [
    {
      key: 'code', label: 'Code',
      sortable: true,
      exportValue: (r: PromoCode) => r.code,
      render: (r: PromoCode) => (
        <span className="font-mono font-black text-brand-green text-sm bg-brand-green/10 px-2 py-1 rounded-lg tracking-widest">{r.code}</span>
      ),
    },
    {
      key: 'value', label: 'Remise',
      sortable: true,
      sortValue: (r: PromoCode) => Number(r.value) || 0,
      exportValue: (r: PromoCode) => r.type === 'PERCENTAGE' ? `${r.value} %` : `${r.value} FCFA`,
      render: (r: PromoCode) => (
        <span className="font-bold text-slate-200">
          {r.type === 'PERCENTAGE' ? `${r.value} %` : formatCFA(r.value)}
        </span>
      ),
    },
    {
      key: 'professional', label: 'Établissement',
      sortable: true, hideOnMobile: true,
      sortValue: (r: PromoCode) => (r.professional?.businessName ?? '').toLowerCase(),
      exportValue: (r: PromoCode) => r.professional?.businessName ?? '',
      render: (r: PromoCode) => (
        <span className="text-sm text-slate-400 truncate max-w-[140px] block">
          {r.professional?.businessName ?? <span className="text-slate-600 italic">Tous</span>}
        </span>
      ),
    },
    {
      key: 'product', label: 'Produit',
      sortable: true, hideOnMobile: true,
      exportValue: (r: PromoCode) => resolveName(r.product?.name),
      render: (r: PromoCode) => (
        <span className="text-sm text-slate-400 truncate max-w-[140px] block">
          {r.product ? resolveName(r.product.name) : <span className="text-slate-600 italic">Tous</span>}
        </span>
      ),
    },
    {
      key: 'minOrder', label: 'Min.',
      sortable: true, hideOnMobile: true,
      sortValue: (r: PromoCode) => Number(r.minOrder) || 0,
      exportValue: (r: PromoCode) => r.minOrder ?? 0,
      render: (r: PromoCode) => <span className="text-sm text-slate-400">{r.minOrder > 0 ? formatCFA(r.minOrder) : '—'}</span>,
    },
    {
      key: 'uses', label: 'Usages',
      sortable: true, hideOnMobile: true,
      sortValue: (r: PromoCode) => Number(r.usesCount) || 0,
      exportValue: (r: PromoCode) => `${r.usesCount}${r.maxUses != null ? '/' + r.maxUses : ''}`,
      render: (r: PromoCode) => (
        <span className="text-sm text-slate-300">
          {r.usesCount}{r.maxUses != null ? ` / ${r.maxUses}` : ''}
        </span>
      ),
    },
    {
      key: 'expiresAt', label: 'Expiration',
      sortable: true, hideOnMobile: true,
      sortValue: (r: PromoCode) => r.expiresAt ? new Date(r.expiresAt).getTime() : 0,
      exportValue: (r: PromoCode) => r.expiresAt ?? '',
      render: (r: PromoCode) => <span className="text-xs text-slate-400">{formatDate(r.expiresAt)}</span>,
    },
    {
      key: 'isActive', label: 'Actif',
      sortable: true,
      sortValue: (r: PromoCode) => r.isActive ? 1 : 0,
      exportValue: (r: PromoCode) => r.isActive ? 'Oui' : 'Non',
      render: (r: PromoCode) => (
        <button
          onClick={(e) => { e.stopPropagation(); toggleMutation.mutate(r.id) }}
          className={`flex items-center gap-1.5 text-xs font-bold px-2 py-1 rounded-lg transition-colors ${r.isActive ? 'text-green-400 bg-green-500/10 hover:bg-green-500/20' : 'text-slate-500 bg-navy-700 hover:bg-navy-600'}`}
        >
          {r.isActive ? <ToggleRight size={14}/> : <ToggleLeft size={14}/>}
          {r.isActive ? 'Actif' : 'Inactif'}
        </button>
      ),
    },
    {
      key: 'actions', label: '', width: '80px',
      render: (r: PromoCode) => (
        <div className="flex gap-1">
          <button
            onClick={(e) => { e.stopPropagation(); openEdit(r) }}
            className="p-1.5 text-blue-400 hover:bg-blue-500/10 rounded-lg"
          >
            <Pencil size={14}/>
          </button>
          <button
            onClick={async (e) => {
              e.stopPropagation()
              const ok = await confirm({
                title: 'Supprimer ce code promo ?',
                message: `Le code « ${r.code} » sera désactivé et supprimé. Les commandes déjà utilisant ce code ne sont pas affectées.`,
                variant: 'danger',
                confirmLabel: 'Supprimer',
              })
              if (ok) deleteMutation.mutate(r.id)
            }}
            className="p-1.5 text-red-400 hover:bg-red-500/10 rounded-lg"
          >
            <Trash2 size={14}/>
          </button>
        </div>
      ),
    },
  ]

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-black text-slate-100">Codes promo</h1>
          <p className="text-sm text-slate-400 mt-0.5">{codes.length} code{codes.length !== 1 ? 's' : ''} enregistré{codes.length !== 1 ? 's' : ''}</p>
        </div>
        <button onClick={openCreate} className="btn-primary gap-2">
          <Plus size={16}/> Nouveau code
        </button>
      </div>

      <div className="card p-5">
        <DataTable
          columns={columns}
          data={codes}
          loading={isLoading}
          exportable
          exportFilename="codes-promo"
        />
      </div>

      <Modal open={modalOpen} onClose={closeModal} title={editing ? 'Modifier le code promo' : 'Nouveau code promo'} size="lg">
        <div className="space-y-4 max-h-[72vh] overflow-y-auto pr-1">

          {/* Code + Type */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">Code *</label>
              <input
                className="input uppercase"
                placeholder="EX: BIENVENUE20"
                value={form.code}
                onChange={e => setForm(f => ({ ...f, code: e.target.value.toUpperCase() }))}
              />
            </div>
            <div>
              <label className="label">Type</label>
              <select className="input" value={form.type} onChange={e => setForm(f => ({ ...f, type: e.target.value as any }))}>
                <option value="PERCENTAGE">Pourcentage (%)</option>
                <option value="FIXED_AMOUNT">Montant fixe (F CFA)</option>
              </select>
            </div>
          </div>

          {/* Valeur + Min commande */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">{form.type === 'PERCENTAGE' ? 'Valeur (%) *' : 'Montant (F CFA) *'}</label>
              <input
                className="input"
                inputMode="decimal"
                placeholder={form.type === 'PERCENTAGE' ? 'Ex: 20' : 'Ex: 1000'}
                value={form.value}
                onChange={e => setForm(f => ({ ...f, value: e.target.value }))}
              />
            </div>
            <div>
              <label className="label">Commande minimum (F CFA)</label>
              <input
                className="input"
                inputMode="decimal"
                placeholder="0"
                value={form.minOrder}
                onChange={e => setForm(f => ({ ...f, minOrder: e.target.value }))}
              />
            </div>
          </div>

          {/* Max utilisations + Expiration */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">Utilisations max (vide = illimité)</label>
              <input
                className="input"
                inputMode="numeric"
                placeholder="Illimité"
                value={form.maxUses}
                onChange={e => setForm(f => ({ ...f, maxUses: e.target.value }))}
              />
            </div>
            <div>
              <label className="label">Date d'expiration</label>
              <input
                className="input"
                type="date"
                value={form.expiresAt}
                onChange={e => setForm(f => ({ ...f, expiresAt: e.target.value }))}
              />
            </div>
          </div>

          {/* Établissement concerné */}
          <div>
            <label className="label">Établissement concerné <span className="text-slate-600 font-normal">(optionnel)</span></label>
            <select
              className="input w-full"
              value={form.professionalId}
              onChange={e => handleProChange(e.target.value)}
            >
              <option value="">— Tous les établissements —</option>
              {pros.map((p: any) => (
                <option key={p.id} value={p.id}>
                  {p.businessName}{p.city ? ` · ${p.city}` : ''}
                </option>
              ))}
            </select>
          </div>

          {/* Produit concerné — visible seulement si un pro est sélectionné */}
          {form.professionalId && (
            <div>
              <label className="label">Produit concerné <span className="text-slate-600 font-normal">(optionnel)</span></label>
              <select
                className="input w-full"
                value={form.productId}
                onChange={e => setForm(f => ({ ...f, productId: e.target.value }))}
              >
                <option value="">— Tous les produits de cet établissement —</option>
                {proProducts.map((p: any) => (
                  <option key={p.id} value={p.id}>
                    {resolveName(p.name)}{p.price ? ` — ${formatCFA(p.price)}` : ''}
                  </option>
                ))}
              </select>
              {proProducts.length === 0 && (
                <p className="text-xs text-slate-600 mt-1 font-semibold italic">Aucun produit dans le catalogue de cet établissement</p>
              )}
            </div>
          )}

          {/* Pays */}
          <div>
            <label className="label">Pays <span className="text-slate-600 font-normal">(vide = tous · Ctrl/Cmd+clic pour sélection multiple)</span></label>
            <select
              multiple
              size={6}
              value={form.countries}
              onChange={e => setForm(f => ({ ...f, countries: Array.from(e.target.selectedOptions).map(o => o.value) }))}
              className="input w-full mt-1"
            >
              {COUNTRIES.map(c => (
                <option key={c.code} value={c.code}>{c.name}</option>
              ))}
            </select>
            {form.countries.length > 0 && (
              <div className="flex flex-wrap gap-1 mt-1.5">
                {form.countries.map(code => {
                  const name = COUNTRIES.find(c => c.code === code)?.name ?? code
                  return (
                    <span key={code} className="flex items-center gap-1 px-2 py-0.5 rounded-lg text-xs font-semibold bg-brand-green/15 border border-brand-green/30 text-brand-green">
                      {name}
                      <button type="button" onClick={() => setForm(f => ({ ...f, countries: f.countries.filter(c => c !== code) }))} className="text-brand-green/60 hover:text-brand-green leading-none">×</button>
                    </span>
                  )
                })}
                <button type="button" onClick={() => setForm(f => ({ ...f, countries: [] }))} className="text-xs text-slate-500 hover:text-slate-300 px-1">tout effacer</button>
              </div>
            )}
          </div>

          {/* Par utilisateur */}
          <label className="flex items-center gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={form.perUser}
              onChange={e => setForm(f => ({ ...f, perUser: e.target.checked }))}
              className="w-4 h-4 rounded accent-brand-green"
            />
            <span className="text-sm text-slate-300">Limiter à une utilisation par utilisateur</span>
          </label>

          <div className="flex gap-3 pt-2">
            <button onClick={closeModal} className="btn-secondary flex-1 justify-center">Annuler</button>
            <button onClick={handleSubmit} disabled={isPending} className="btn-primary flex-1 justify-center">
              {editing ? 'Enregistrer' : 'Créer'}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  )
}
