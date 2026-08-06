import React, { useState, useMemo, useRef } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import api from '../../services/api'
import { Modal } from '../../components/ui/Modal'
import { Badge } from '../../components/ui/Badge'
import { formatCFA } from '../../utils/format'
import { COUNTRIES } from '../../constants/countries'
import {
  Search, Plus, Pencil, Trash2, Eye, EyeOff, FolderPlus,
  Building2, X, ImageIcon, Package, Tag, ArrowUpDown,
} from 'lucide-react'
import toast from 'react-hot-toast'
import { useConfirm } from '../../hooks/useConfirm'

// Types d'établissement — même enum Prisma ProfessionalCategory que côté pro.
// Une catégorie de catalogue rattachée à un type n'apparaît que pour les
// pros de ce type (+ catégories non rattachées, visibles par tous en attendant
// une réassignation manuelle par l'admin).
const ESTABLISHMENT_TYPES = [
  { value: 'RESTAURANT',  label: '🍽️ Restaurant' },
  { value: 'GROCERY',     label: '🥬 Épicerie' },
  { value: 'SUPERMARKET', label: '🛒 Supermarché' },
  { value: 'BAKERY',      label: '🥖 Boulangerie' },
  { value: 'PHARMACY',    label: '💊 Pharmacie' },
  { value: 'OTHER',       label: '📦 Autre' },
]
const establishmentLabel = (v: string | null) =>
  v ? (ESTABLISHMENT_TYPES.find(t => t.value === v)?.label ?? v) : 'Non assignée'

// ─── Sélecteur de professionnel ──────────────────────────────────────────────

const ProSelector: React.FC<{ onSelect: (pro: any) => void }> = ({ onSelect }) => {
  const [search, setSearch]           = useState('')
  const [filterCountry, setFilterCountry] = useState('')
  const [filterCity, setFilterCity]       = useState('')

  const { data: pros = [], isLoading } = useQuery({
    queryKey: ['all-professionals-selector'],
    queryFn: () => api.get('/admin/professionals?limit=500').then((r: any) => r?.data?.data ?? r?.data ?? []),
  })

  const filtered = useMemo(() => pros.filter((p: any) => {
    const matchSearch  = !search        || p.businessName?.toLowerCase().includes(search.toLowerCase()) || p.city?.toLowerCase().includes(search.toLowerCase())
    const matchCountry = !filterCountry || p.country === filterCountry
    const matchCity    = !filterCity    || p.city?.toLowerCase().includes(filterCity.toLowerCase())
    return matchSearch && matchCountry && matchCity
  }), [pros, search, filterCountry, filterCity])

  const hasFilters = search || filterCountry || filterCity
  const reset = () => { setSearch(''); setFilterCountry(''); setFilterCity('') }

  return (
    <div className="space-y-4">
      <div className="relative">
        <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-ink3"/>
        <input value={search} onChange={e => setSearch(e.target.value)}
          placeholder="Rechercher par nom d'établissement ou ville…"
          className="input pl-9 h-9 text-sm w-full"/>
        {search && (
          <button onClick={() => setSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-ink3 hover:text-ink2">
            <X size={14}/>
          </button>
        )}
      </div>

      <div className="flex gap-3">
        <div className="flex-1">
          <label className="label text-[10px]">Pays</label>
          <select className="input text-sm" value={filterCountry} onChange={e => setFilterCountry(e.target.value)}>
            <option value="">Tous</option>
            {COUNTRIES.map(c => <option key={c.code} value={c.code}>{c.name} ({c.code})</option>)}
          </select>
        </div>
        <div className="flex-1">
          <label className="label text-[10px]">Ville</label>
          <input className="input text-sm" value={filterCity} onChange={e => setFilterCity(e.target.value)} placeholder="Cotonou…"/>
        </div>
        {hasFilters && (
          <div className="flex items-end">
            <button onClick={reset} className="btn-secondary text-xs px-3 py-2">Réinitialiser</button>
          </div>
        )}
      </div>

      <div className="flex items-center justify-between text-xs">
        <span className="text-ink3 font-semibold">
          {filtered.length} établissement{filtered.length !== 1 ? 's' : ''}
          {hasFilters ? ' trouvé' + (filtered.length !== 1 ? 's' : '') : ''}
        </span>
        <span className="text-ink3">{pros.length} au total</span>
      </div>

      {isLoading ? (
        <div className="space-y-2">{Array.from({length:4}).map((_,i) => <div key={i} className="h-14 bg-card rounded-xl animate-pulse"/>)}</div>
      ) : filtered.length === 0 ? (
        <p className="text-ink3 text-sm text-center py-8">Aucun établissement trouvé</p>
      ) : (
        <div className="space-y-2 max-h-[480px] overflow-y-auto pr-1">
          {filtered.map((p: any) => (
            <button key={p.id} onClick={() => onSelect(p)}
              className="w-full flex items-center gap-3 p-3 bg-card border border-edge rounded-xl hover:border-brand-green/50 hover:bg-lift transition-all text-left">
              <div className="w-9 h-9 rounded-lg bg-brand-green/10 border border-brand-green/20 flex items-center justify-center flex-shrink-0">
                <Building2 size={16} className="text-brand-green"/>
              </div>
              <div className="flex-1 min-w-0">
                <div className="font-bold text-ink text-sm truncate">{p.businessName}</div>
                <div className="text-xs text-ink3">{p.category} · {p.city}{p.country ? ` (${p.country})` : ''}</div>
              </div>
              <Badge status={p.status}/>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

// ─── Formulaire produit ───────────────────────────────────────────────────────

interface ProductFormData {
  proId: string
  name: string
  description: string
  price: string
  currency: string
  isAvailable: boolean
  isMenu: boolean
  categoryId: string
  imageUrl: string
  stock: string
  variants: { name: string; price: string }[]
}

const EMPTY_PRODUCT: ProductFormData = {
  proId: '', name: '', description: '', price: '', currency: 'XOF',
  isAvailable: true, isMenu: false, categoryId: '', imageUrl: '', stock: '', variants: [],
}

const ProductForm: React.FC<{
  form: ProductFormData
  onChange: (f: ProductFormData) => void
  mode: 'create' | 'edit'
}> = ({ form, onChange, mode }) => {
  const set = (k: keyof ProductFormData) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
    onChange({ ...form, [k]: e.target.value })

  const { data: pros = [] } = useQuery({
    queryKey: ['all-professionals-selector'],
    queryFn: () => api.get('/admin/professionals?limit=500').then((r: any) => r?.data?.data ?? r?.data ?? []),
    staleTime: 5 * 60 * 1000,
  })

  // Catégories globales (indépendantes d'un pro)
  const { data: proCategories = [] } = useQuery({
    queryKey: ['admin-global-categories'],
    queryFn: () => api.get('/admin/catalogue/categories').then((r: any) => {
      const d = r?.data?.data ?? r?.data
      return Array.isArray(d) ? d : []
    }),
    staleTime: 60_000,
  })

  const handleProChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    onChange({ ...form, proId: e.target.value, categoryId: '' })
  }

  // Catégories visibles pour le pro sélectionné : celles rattachées à son
  // type d'établissement + les non-assignées (legacy, en attente de tri admin).
  const selectedPro = pros.find((p: any) => p.id === form.proId)
  const visibleCategories = selectedPro
    ? proCategories.filter((c: any) => !c.establishmentType || c.establishmentType === selectedPro.category)
    : proCategories

  const [uploading, setUploading] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)

  const handleImageUpload = async (file: File) => {
    if (!file) return
    const fd = new FormData()
    fd.append('image', file)
    setUploading(true)
    try {
      const res: any = await api.post('/admin/catalogue/upload-image', fd, {
        headers: { 'Content-Type': undefined },
      })
      const url = res?.data?.data?.url ?? res?.data?.url
      if (url) onChange({ ...form, imageUrl: url })
      else toast.error('URL introuvable dans la réponse')
    } catch (e: any) {
      toast.error(e?.response?.data?.message ?? 'Erreur upload')
    } finally {
      setUploading(false)
    }
  }

  const addVariant = () => onChange({ ...form, variants: [...form.variants, { name: '', price: '' }] })
  const removeVariant = (i: number) => onChange({ ...form, variants: form.variants.filter((_, idx) => idx !== i) })
  const setVariant = (i: number, k: 'name' | 'price', v: string) =>
    onChange({ ...form, variants: form.variants.map((va, idx) => idx === i ? { ...va, [k]: v } : va) })

  return (
    <div className="space-y-4">
      {/* Établissement */}
      {mode === 'create' && (
        <div>
          <label className="label">Établissement *</label>
          <select value={form.proId} onChange={handleProChange} className="input w-full" required>
            <option value="">— Sélectionner un établissement —</option>
            {pros.map((p: any) => (
              <option key={p.id} value={p.id}>
                {p.businessName}{p.city ? ` · ${p.city}` : ''}{p.country ? ` (${p.country})` : ''}
              </option>
            ))}
          </select>
        </div>
      )}

      {/* Nom */}
      <div>
        <label className="label">Nom du produit *</label>
        <input value={form.name} onChange={set('name')} placeholder="Ex : Poulet braisé, Riz sauce tomate…" className="input w-full"/>
      </div>

      {/* Description */}
      <div>
        <label className="label">Description (optionnelle)</label>
        <textarea value={form.description} onChange={set('description')}
          placeholder="Ingrédients, allergènes, note…" className="input w-full h-20 resize-none text-sm"/>
      </div>

      {/* Prix + devise */}
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="label">Prix *</label>
          <input type="number" min="0" value={form.price} onChange={set('price')} placeholder="1500" className="input w-full"/>
        </div>
        <div>
          <label className="label">Devise</label>
          <select value={form.currency} onChange={set('currency')} className="input w-full">
            <option value="XOF">XOF (FCFA)</option>
            <option value="EUR">EUR</option>
            <option value="USD">USD</option>
          </select>
        </div>
      </div>

      {/* Catégorie + stock */}
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="label">Catégorie <span className="text-red-400">*</span></label>
          <select value={form.categoryId} onChange={set('categoryId')} className={`input w-full ${!form.categoryId ? 'border-red-500/40' : ''}`}>
            <option value="">— Sélectionner une catégorie —</option>
            {visibleCategories.map((c: any) => (
              <option key={c.id} value={c.id}>{c.icon ? `${c.icon} ` : ''}{c.name?.fr || c.name?.en || c.name}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="label">Stock (optionnel)</label>
          <input type="number" min="0" value={form.stock} onChange={set('stock')} placeholder="—" className="input w-full"/>
        </div>
      </div>

      {/* Image */}
      <div>
        <label className="label">Image du produit</label>
        {form.imageUrl ? (
          <div className="flex items-center gap-3">
            <img src={form.imageUrl} alt="" className="w-16 h-16 rounded-xl object-cover border border-edge"/>
            <div className="flex flex-col gap-1.5">
              <button type="button" onClick={() => fileRef.current?.click()}
                className="btn-secondary text-xs py-1 px-3">{uploading ? 'Upload…' : 'Changer'}</button>
              <button type="button" onClick={() => onChange({ ...form, imageUrl: '' })}
                className="text-xs text-red-400 hover:text-red-300 font-semibold text-left">Supprimer</button>
            </div>
          </div>
        ) : (
          <button type="button" onClick={() => fileRef.current?.click()}
            disabled={uploading}
            className="w-full flex items-center justify-center gap-2 p-6 border-2 border-dashed border-edge rounded-xl text-ink3 hover:text-ink2 hover:border-edge transition-colors disabled:opacity-50">
            {uploading ? (
              <div className="w-4 h-4 border-2 border-brand-green border-t-transparent rounded-full animate-spin"/>
            ) : (
              <ImageIcon size={18}/>
            )}
            <span className="text-sm font-semibold">{uploading ? 'Upload en cours…' : 'Ajouter une image'}</span>
          </button>
        )}
        <input ref={fileRef} type="file" accept="image/*" className="hidden"
          onChange={e => { if (e.target.files?.[0]) handleImageUpload(e.target.files[0]) }}/>
      </div>

      {/* Variantes */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <label className="label mb-0">Variantes (optionnel)</label>
          <button type="button" onClick={addVariant} className="text-xs text-brand-green hover:text-brand-green/80 font-bold flex items-center gap-1">
            <Plus size={12}/> Ajouter
          </button>
        </div>
        {form.variants.length === 0 ? (
          <p className="text-xs text-ink3 font-semibold italic">Ex : Petite / Grande, Sans sauce…</p>
        ) : (
          <div className="space-y-2">
            {form.variants.map((v, i) => (
              <div key={i} className="flex items-center gap-2">
                <input value={v.name} onChange={e => setVariant(i, 'name', e.target.value)}
                  placeholder="Nom (ex: Grande)" className="input flex-1 text-sm py-1.5"/>
                <input type="number" min="0" value={v.price} onChange={e => setVariant(i, 'price', e.target.value)}
                  placeholder="Prix" className="input w-28 text-sm py-1.5"/>
                <button type="button" onClick={() => removeVariant(i)} className="p-1.5 text-red-400 hover:bg-red-500/10 rounded-lg">
                  <X size={13}/>
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Disponibilité + Menu */}
      <div className="flex items-center gap-6 flex-wrap">
        <label className="flex items-center gap-2 cursor-pointer">
          <input type="checkbox" checked={form.isAvailable}
            onChange={e => onChange({ ...form, isAvailable: e.target.checked })}
            className="w-4 h-4 rounded accent-brand-green"/>
          <span className="text-sm font-semibold text-ink2">Disponible à la commande</span>
        </label>
        <label className="flex items-center gap-2 cursor-pointer">
          <input type="checkbox" checked={form.isMenu}
            onChange={e => onChange({ ...form, isMenu: e.target.checked })}
            className="w-4 h-4 rounded accent-brand-green"/>
          <span className="text-sm font-semibold text-ink2">Menu du jour</span>
        </label>
      </div>
    </div>
  )
}

// ─── Vue catalogue d'un pro ───────────────────────────────────────────────────

type SortKey = 'name_asc' | 'name_desc' | 'price_asc' | 'price_desc' | 'available_first'

const CatalogueView: React.FC<{ pro: any; onBack: () => void }> = ({ pro, onBack }) => {
  const qc = useQueryClient()
  const confirm = useConfirm()
  const qKey = ['admin-catalogue', pro.id]

  const [productModal, setProductModal] = useState<{ mode: 'create' | 'edit'; product?: any } | null>(null)
  const [productForm, setProductForm]   = useState<ProductFormData>(EMPTY_PRODUCT)
  const [catFilter, setCatFilter]       = useState<string>('all')
  const [sortKey, setSortKey]           = useState<SortKey>('name_asc')

  const { data, isLoading } = useQuery({
    queryKey: qKey,
    queryFn: () => api.get(`/admin/catalogue/${pro.id}`).then((r: any) => r?.data?.data ?? r?.data),
  })
  const categories: any[] = data?.categories ?? []
  // Produits sans catégorie (categoryId = null) — chargés séparément par l'API
  // car ils sont invisibles dans la vue par catégories classique.
  const uncategorized: any[] = data?.uncategorizedProducts ?? []

  // Aplatir tous les produits : catégorisés + sans catégorie
  const allProducts = useMemo(() => {
    const seen = new Set<string>()
    const list: any[] = []
    for (const cat of categories) {
      for (const p of cat.products ?? []) {
        if (!seen.has(p.id)) { seen.add(p.id); list.push({ ...p, _catName: cat.name?.fr || cat.name?.en || 'Catégorie', _catIcon: cat.icon }) }
      }
    }
    // Produits sans catégorie — ajoutés à la fin avec un marqueur visuel
    for (const p of uncategorized) {
      if (!seen.has(p.id)) { seen.add(p.id); list.push({ ...p, _catName: 'Sans catégorie', _catIcon: '⚠️' }) }
    }
    return list
  }, [categories, uncategorized])

  const visibleProducts = useMemo(() => {
    let list = catFilter === 'all'
      ? allProducts
      : catFilter === '__none__'
        ? allProducts.filter(p => !p.categoryId)
        : allProducts.filter(p => p.categoryId === catFilter)

    switch (sortKey) {
      case 'name_asc':         list = [...list].sort((a, b) => (a.name?.fr || '').localeCompare(b.name?.fr || '')); break
      case 'name_desc':        list = [...list].sort((a, b) => (b.name?.fr || '').localeCompare(a.name?.fr || '')); break
      case 'price_asc':        list = [...list].sort((a, b) => a.price - b.price); break
      case 'price_desc':       list = [...list].sort((a, b) => b.price - a.price); break
      case 'available_first':  list = [...list].sort((a, b) => (b.isAvailable ? 1 : 0) - (a.isAvailable ? 1 : 0)); break
    }
    return list
  }, [allProducts, catFilter, sortKey])

  const buildProductPayload = (f: ProductFormData) => ({
    name: { fr: f.name, en: f.name },
    description: f.description ? { fr: f.description, en: f.description } : null,
    price: Number(f.price),
    currency: f.currency,
    isAvailable: f.isAvailable,
    isMenu: f.isMenu,
    categoryId: f.categoryId || null,
    imageUrl: f.imageUrl || null,
    stock: f.stock !== '' ? Number(f.stock) : null,
    variants: f.variants.length > 0
      ? f.variants.filter(v => v.name.trim()).map(v => ({ name: v.name.trim(), price: Number(v.price) || 0 }))
      : null,
  })

  const createProductMutation = useMutation({
    mutationFn: () => api.post(`/admin/catalogue/${pro.id}/products`, buildProductPayload(productForm)),
    onSuccess: () => { toast.success('Produit créé'); qc.invalidateQueries({queryKey: qKey}); setProductModal(null) },
    onError: (e: any) => toast.error(e.message),
  })

  const updateProductMutation = useMutation({
    mutationFn: (id: string) => api.patch(`/admin/catalogue/products/${id}`, buildProductPayload(productForm)),
    onSuccess: () => { toast.success('Produit mis à jour'); qc.invalidateQueries({queryKey: qKey}); setProductModal(null) },
    onError: (e: any) => toast.error(e.message),
  })

  const deleteProductMutation = useMutation({
    mutationFn: (id: string) => api.delete(`/admin/catalogue/products/${id}`),
    onSuccess: () => { toast.success('Produit supprimé'); qc.invalidateQueries({queryKey: qKey}) },
    onError: (e: any) => toast.error(e.message),
  })

  const toggleProductMutation = useMutation({
    mutationFn: (id: string) => api.patch(`/admin/catalogue/products/${id}/toggle`, {}),
    onSuccess: () => qc.invalidateQueries({queryKey: qKey}),
    onError: (e: any) => toast.error(e.message),
  })

  const openCreateProduct = () => {
    setProductForm({ ...EMPTY_PRODUCT, proId: pro.id })
    setProductModal({ mode: 'create' })
  }

  const openEditProduct = (product: any) => {
    const rawVariants: any[] = Array.isArray(product.variants) ? product.variants : []
    setProductForm({
      proId: pro.id,
      name: product.name?.fr || product.name?.en || '',
      description: product.description?.fr || '',
      price: String(product.price),
      currency: product.currency ?? 'XOF',
      isAvailable: product.isAvailable,
      isMenu: product.isMenu ?? false,
      categoryId: product.categoryId ?? '',
      imageUrl: product.imageUrl ?? '',
      stock: product.stock != null ? String(product.stock) : '',
      variants: rawVariants.map((v: any) => ({ name: v.name ?? '', price: String(v.price ?? '') })),
    })
    setProductModal({ mode: 'edit', product })
  }

  // Catégories avec au moins un produit pour ce pro
  const catsWithProducts = useMemo(() =>
    categories.filter(c => (c.products ?? []).length > 0),
  [categories])

  const totalProductCount = allProducts.length

  const hasFilters = catFilter !== 'all' || sortKey !== 'name_asc'

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center gap-4 flex-wrap">
        <button onClick={onBack} className="p-2 text-ink2 hover:text-white hover:bg-lift rounded-xl transition-colors text-sm font-bold">
          ← Retour
        </button>
        <div className="flex items-center gap-3 flex-1">
          <div className="w-10 h-10 rounded-xl bg-brand-green/10 border border-brand-green/20 flex items-center justify-center flex-shrink-0">
            <Building2 size={18} className="text-brand-green"/>
          </div>
          <div>
            <div className="font-black text-ink">{pro.businessName}</div>
            <div className="text-xs text-ink3 flex items-center gap-2">
              {pro.category} · {pro.city} · {totalProductCount} produit{totalProductCount !== 1 ? 's' : ''}
              {uncategorized.length > 0 && (
                <span className="text-yellow-400 font-bold">⚠️ {uncategorized.length} sans catégorie</span>
              )}
            </div>
          </div>
        </div>
        <button onClick={openCreateProduct} className="btn-primary">
          <Plus size={15}/> Produit
        </button>
      </div>

      {/* Barre filtres + tri */}
      <div className="card p-3 flex flex-wrap gap-2 items-center">
        {/* Filtre catégorie — chips */}
        <div className="flex flex-wrap gap-1.5 flex-1">
          {[
            { id: 'all', label: 'Toutes', icon: null },
            ...catsWithProducts.map((c: any) => ({ id: c.id, label: c.name?.fr || c.name?.en || 'Catégorie', icon: c.icon })),
            ...(uncategorized.length > 0 ? [{ id: '__none__', label: `Sans catégorie (${uncategorized.length})`, icon: '⚠️' }] : []),
          ].map(chip => (
            <button key={chip.id} onClick={() => setCatFilter(chip.id)}
              className={`px-3 py-1 rounded-full text-xs font-bold transition-all border ${
                catFilter === chip.id
                  ? 'bg-brand-green text-white border-brand-green'
                  : 'bg-card text-ink2 border-edge hover:border-brand-green/40 hover:text-ink'
              }`}>
              {chip.icon && <span className="mr-1">{chip.icon}</span>}{chip.label}
            </button>
          ))}
        </div>

        {/* Tri */}
        <div className="flex items-center gap-2 flex-shrink-0">
          <ArrowUpDown size={13} className="text-ink3"/>
          <select value={sortKey} onChange={e => setSortKey(e.target.value as SortKey)}
            className="input text-xs py-1.5 px-2 min-w-[150px]">
            <option value="name_asc">Nom A → Z</option>
            <option value="name_desc">Nom Z → A</option>
            <option value="price_asc">Prix croissant</option>
            <option value="price_desc">Prix décroissant</option>
            <option value="available_first">Disponibles d'abord</option>
          </select>
          {hasFilters && (
            <button onClick={() => { setCatFilter('all'); setSortKey('name_asc') }}
              className="p-1.5 text-ink3 hover:text-ink hover:bg-lift rounded-lg transition-colors" title="Réinitialiser">
              <X size={13}/>
            </button>
          )}
        </div>
      </div>

      {/* Liste produits */}
      {isLoading ? (
        <div className="space-y-2">{Array.from({length: 5}).map((_, i) => (
          <div key={i} className="h-16 bg-card rounded-xl animate-pulse"/>
        ))}</div>
      ) : allProducts.length === 0 ? (
        <div className="card p-12 text-center">
          <Package size={32} className="text-ink3 mx-auto mb-3"/>
          <p className="text-ink3 font-semibold mb-1">Aucun produit dans ce catalogue</p>
          <button onClick={openCreateProduct} className="btn-primary mx-auto mt-3">
            <Plus size={14}/> Ajouter le premier produit
          </button>
        </div>
      ) : visibleProducts.length === 0 ? (
        <div className="card p-10 text-center">
          <p className="text-ink3 font-semibold text-sm">Aucun produit dans cette catégorie</p>
        </div>
      ) : (
        <div className="card overflow-hidden divide-y divide-navy-800">
          {visibleProducts.map((product: any) => {
            const variantCount = Array.isArray(product.variants) ? product.variants.length : 0
            const catLabel = product._catIcon ? `${product._catIcon} ${product._catName}` : product._catName
            return (
              <div key={product.id} className="flex items-center gap-4 px-5 py-3 hover:bg-card/30 transition-colors">
                {product.imageUrl ? (
                  <img src={product.imageUrl} alt="" className="w-10 h-10 rounded-lg object-cover flex-shrink-0 border border-edge2"/>
                ) : (
                  <div className="w-10 h-10 rounded-lg bg-lift flex items-center justify-center flex-shrink-0 text-lg">🍽️</div>
                )}
                <div className="flex-1 min-w-0">
                  <div className="font-semibold text-ink text-sm truncate flex items-center gap-2">
                    {product.name?.fr || product.name?.en || '—'}
                    {product.isMenu && <span className="text-[10px] font-bold text-amber-400 bg-amber-400/10 px-1.5 py-0.5 rounded">MENU</span>}
                  </div>
                  <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                    <span className="text-[10px] text-ink3 font-semibold">{catLabel}</span>
                    {product.description?.fr && (
                      <span className="text-xs text-ink3 truncate max-w-[160px]">{product.description.fr}</span>
                    )}
                    {variantCount > 0 && (
                      <span className="text-[10px] font-bold text-blue-400 bg-blue-400/10 px-1.5 py-0.5 rounded">
                        {variantCount} variante{variantCount !== 1 ? 's' : ''}
                      </span>
                    )}
                    {product.stock != null && (
                      <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded flex items-center gap-1 ${product.stock === 0 ? 'text-red-400 bg-red-400/10' : 'text-ink2 bg-lift'}`}>
                        <Package size={9}/> {product.stock}
                      </span>
                    )}
                  </div>
                </div>
                <span className="font-black text-brand-green text-sm w-24 text-right flex-shrink-0">{formatCFA(product.price)}</span>
                <button onClick={() => toggleProductMutation.mutate(product.id)}
                  title={product.isAvailable ? 'Masquer' : 'Rendre disponible'}
                  className={`p-1.5 rounded-lg transition-colors ${product.isAvailable ? 'text-green-400 hover:bg-green-500/10' : 'text-ink3 hover:bg-lift'}`}>
                  {product.isAvailable ? <Eye size={14}/> : <EyeOff size={14}/>}
                </button>
                <button onClick={() => openEditProduct(product)} className="p-1.5 text-blue-400 hover:bg-blue-500/10 rounded-lg">
                  <Pencil size={14}/>
                </button>
                <button onClick={async () => {
                  const ok = await confirm({
                    title: 'Supprimer ce produit ?',
                    message: `« ${product.name?.fr ?? product.name} » sera retiré du catalogue.`,
                    variant: 'danger', confirmLabel: 'Supprimer',
                  })
                  if (ok) deleteProductMutation.mutate(product.id)
                }} className="p-1.5 text-red-400 hover:bg-red-500/10 rounded-lg">
                  <Trash2 size={14}/>
                </button>
              </div>
            )
          })}
        </div>
      )}

      {/* Compteur résultats filtrés */}
      {catFilter !== 'all' && visibleProducts.length > 0 && (
        <p className="text-xs text-ink3 font-semibold text-right">
          {visibleProducts.length} / {allProducts.length} produit{allProducts.length !== 1 ? 's' : ''}
        </p>
      )}

      {/* Modal — Créer / Éditer produit */}
      <Modal open={!!productModal} onClose={() => setProductModal(null)}
        title={productModal?.mode === 'edit' ? 'Modifier le produit' : 'Nouveau produit'} size="lg">
        <div className="space-y-4 max-h-[72vh] overflow-y-auto pr-1">
          <ProductForm
            form={productForm}
            onChange={setProductForm}
            mode={productModal?.mode ?? 'create'}
          />
          <div className="flex gap-3 pt-1 sticky bottom-0 bg-panel pb-1">
            <button onClick={() => setProductModal(null)} className="btn-secondary flex-1 justify-center">Annuler</button>
            <button
              onClick={() => productModal?.mode === 'edit'
                ? updateProductMutation.mutate(productModal.product.id)
                : createProductMutation.mutate()
              }
              disabled={!productForm.name.trim() || !productForm.price || !productForm.categoryId || createProductMutation.isPending || updateProductMutation.isPending}
              className="btn-primary flex-1 justify-center">
              <Plus size={15}/> {productModal?.mode === 'edit' ? 'Enregistrer' : 'Créer le produit'}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  )
}

// ─── Gestion des catégories globales ─────────────────────────────────────────

const GlobalCategoriesPanel: React.FC = () => {
  const qc = useQueryClient()
  const confirm = useConfirm()
  const qKey = ['admin-global-categories']

  const [catModal, setCatModal]   = useState(false)
  const [catForm, setCatForm]     = useState({ name: '', icon: '', establishmentType: '' })

  const { data: categories = [], isLoading } = useQuery({
    queryKey: qKey,
    queryFn: () => api.get('/admin/catalogue/categories').then((r: any) => {
      const d = r?.data?.data ?? r?.data
      return Array.isArray(d) ? d : []
    }),
    staleTime: 60_000,
  })

  const createMutation = useMutation({
    mutationFn: () => api.post('/admin/catalogue/categories', {
      name: { fr: catForm.name, en: catForm.name },
      icon: catForm.icon || undefined,
      establishmentType: catForm.establishmentType || undefined,
    }),
    onSuccess: () => {
      toast.success('Catégorie créée')
      qc.invalidateQueries({ queryKey: qKey })
      setCatModal(false)
      setCatForm({ name: '', icon: '', establishmentType: '' })
    },
    onError: (e: any) => toast.error(e.message),
  })

  // Réassignation manuelle du type d'établissement d'une catégorie existante
  // (catégories historiques créées avant ce champ, establishmentType null).
  const reassignMutation = useMutation({
    mutationFn: ({ id, establishmentType }: { id: string; establishmentType: string }) =>
      api.patch(`/admin/catalogue/categories/${id}`, { establishmentType: establishmentType || null }),
    onSuccess: () => { toast.success('Catégorie rattachée'); qc.invalidateQueries({ queryKey: qKey }) },
    onError: (e: any) => toast.error(e.message),
  })

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.delete(`/admin/catalogue/categories/${id}`),
    onSuccess: () => { toast.success('Catégorie supprimée'); qc.invalidateQueries({ queryKey: qKey }) },
    onError: (e: any) => {
      const msg = e?.response?.data?.message ?? e.message
      toast.error(msg)
    },
  })

  return (
    <div className="card p-6">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-base font-black text-ink flex items-center gap-2">
            <Tag size={17} className="text-brand-green"/> Catégories de catalogue
          </h2>
          <p className="text-sm text-ink3 font-semibold mt-0.5">
            Rattachées à un type d'établissement — un restaurant ne voit que ses propres catégories
          </p>
        </div>
        <button onClick={() => { setCatForm({ name: '', icon: '', establishmentType: '' }); setCatModal(true) }} className="btn-primary">
          <FolderPlus size={15}/> Nouvelle catégorie
        </button>
      </div>

      {isLoading ? (
        <div className="space-y-2">{Array.from({length:3}).map((_,i) => <div key={i} className="h-11 bg-card rounded-xl animate-pulse"/>)}</div>
      ) : categories.length === 0 ? (
        <div className="py-10 text-center">
          <Tag size={24} className="text-ink3 mx-auto mb-2"/>
          <p className="text-ink3 font-semibold text-sm">Aucune catégorie pour l'instant</p>
          <p className="text-ink3 text-xs mt-1">Crée des catégories générales (Plats, Boissons, Entrées…)</p>
        </div>
      ) : (
        <div className="space-y-5">
          {[...ESTABLISHMENT_TYPES.map(t => t.value), null].map((typeValue) => {
            const group = categories.filter((c: any) => (c.establishmentType ?? null) === typeValue)
            if (group.length === 0) return null
            return (
              <div key={typeValue ?? 'unassigned'}>
                <div className="text-xs font-black text-ink3 uppercase tracking-wide mb-2 flex items-center gap-2">
                  {establishmentLabel(typeValue)}
                  {typeValue === null && (
                    <span className="text-[10px] font-bold text-amber-400 bg-amber-400/10 border border-amber-400/20 px-1.5 py-0.5 rounded-full normal-case">
                      à rattacher manuellement
                    </span>
                  )}
                </div>
                <div className="flex flex-wrap gap-2">
                  {group.map((cat: any) => {
                    const productCount: number = cat._count?.products ?? 0
                    const hasProducts = productCount > 0
                    return (
                      <div key={cat.id}
                        className="flex items-center gap-2 px-3 py-2 bg-card border border-edge rounded-xl text-sm font-semibold text-ink">
                        {cat.icon && <span className="text-base leading-none">{cat.icon}</span>}
                        <span>{cat.name?.fr || cat.name?.en || cat.name}</span>
                        {hasProducts && (
                          <span className="text-[10px] font-bold text-amber-400 bg-amber-400/10 border border-amber-400/20 px-1.5 py-0.5 rounded-full leading-none">
                            {productCount} produit{productCount > 1 ? 's' : ''}
                          </span>
                        )}
                        {/* Réassignation manuelle du type d'établissement */}
                        <select
                          value={cat.establishmentType ?? ''}
                          onChange={e => reassignMutation.mutate({ id: cat.id, establishmentType: e.target.value })}
                          className="text-xs bg-transparent border border-edge2 rounded-lg px-1.5 py-0.5 text-ink2 cursor-pointer"
                          title="Rattacher à un type d'établissement"
                        >
                          <option value="">— Non assignée —</option>
                          {ESTABLISHMENT_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                        </select>
                        {hasProducts ? (
                          <span
                            title={`Impossible de supprimer : ${productCount} produit${productCount > 1 ? 's' : ''} utilise${productCount > 1 ? 'nt' : ''} cette catégorie`}
                            className="ml-1 p-0.5 text-ink3 cursor-not-allowed rounded"
                          >
                            <X size={13}/>
                          </span>
                        ) : (
                          <button
                            onClick={async () => {
                              const ok = await confirm({
                                title: 'Supprimer cette catégorie ?',
                                message: `« ${cat.name?.fr ?? cat.name} » sera définitivement supprimée.`,
                                variant: 'danger', confirmLabel: 'Supprimer',
                              })
                              if (ok) deleteMutation.mutate(cat.id)
                            }}
                            className="ml-1 p-0.5 text-ink3 hover:text-red-400 rounded transition-colors"
                            title="Supprimer"
                          >
                            <X size={13}/>
                          </button>
                        )}
                      </div>
                    )
                  })}
                </div>
              </div>
            )
          })}
        </div>
      )}

      <Modal open={catModal} onClose={() => setCatModal(false)} title="Nouvelle catégorie" size="sm">
        <div className="space-y-4">
          <div>
            <label className="label">Nom de la catégorie *</label>
            <input value={catForm.name} onChange={e => setCatForm(f => ({...f, name: e.target.value}))}
              placeholder="Ex : Plats, Boissons, Entrées…" className="input w-full" autoFocus/>
          </div>
          <div>
            <label className="label">Icône (emoji, optionnel)</label>
            <input value={catForm.icon} onChange={e => setCatForm(f => ({...f, icon: e.target.value}))}
              placeholder="🍕" className="input w-full"/>
          </div>
          <div>
            <label className="label">Type d'établissement</label>
            <select value={catForm.establishmentType} onChange={e => setCatForm(f => ({...f, establishmentType: e.target.value}))}
              className="input w-full">
              <option value="">— Non assignée —</option>
              {ESTABLISHMENT_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
            </select>
          </div>
          <div className="flex gap-3 pt-1">
            <button onClick={() => setCatModal(false)} className="btn-secondary flex-1 justify-center">Annuler</button>
            <button onClick={() => createMutation.mutate()} disabled={!catForm.name.trim() || createMutation.isPending}
              className="btn-primary flex-1 justify-center">
              {createMutation.isPending
                ? <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"/>
                : <><FolderPlus size={15}/> Créer</>
              }
            </button>
          </div>
        </div>
      </Modal>
    </div>
  )
}

// ─── Page principale ──────────────────────────────────────────────────────────

export const Catalogue: React.FC = () => {
  const [selectedPro, setSelectedPro] = useState<any>(null)

  if (selectedPro) {
    return <CatalogueView pro={selectedPro} onBack={() => setSelectedPro(null)}/>
  }

  return (
    <div className="space-y-5">
      {/* Section catégories générales */}
      <GlobalCategoriesPanel/>

      {/* Section sélection établissement */}
      <div className="card p-6">
        <h2 className="text-base font-black text-ink mb-1">Gérer un catalogue</h2>
        <p className="text-sm text-ink3 font-semibold mb-5">Sélectionne un établissement pour créer ou modifier son catalogue</p>
        <ProSelector onSelect={setSelectedPro}/>
      </div>
    </div>
  )
}
