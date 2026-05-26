import React, { useState, useMemo, useRef } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import api from '../../services/api'
import { Modal } from '../../components/ui/Modal'
import { Badge } from '../../components/ui/Badge'
import { formatCFA } from '../../utils/format'
import { COUNTRIES } from '../../constants/countries'
import {
  Search, Plus, Pencil, Trash2, Eye, EyeOff, FolderPlus,
  ChevronDown, ChevronRight, Building2, X, ImageIcon, Package,
} from 'lucide-react'
import toast from 'react-hot-toast'
import { useConfirm } from '../../hooks/useConfirm'

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
        <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500"/>
        <input value={search} onChange={e => setSearch(e.target.value)}
          placeholder="Rechercher par nom d'établissement ou ville…"
          className="input pl-9 h-9 text-sm w-full"/>
        {search && (
          <button onClick={() => setSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300">
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
        <span className="text-slate-500 font-semibold">
          {filtered.length} établissement{filtered.length !== 1 ? 's' : ''}
          {hasFilters ? ' trouvé' + (filtered.length !== 1 ? 's' : '') : ''}
        </span>
        <span className="text-slate-600">{pros.length} au total</span>
      </div>

      {isLoading ? (
        <div className="space-y-2">{Array.from({length:4}).map((_,i) => <div key={i} className="h-14 bg-navy-800 rounded-xl animate-pulse"/>)}</div>
      ) : filtered.length === 0 ? (
        <p className="text-slate-500 text-sm text-center py-8">Aucun établissement trouvé</p>
      ) : (
        <div className="space-y-2 max-h-[480px] overflow-y-auto pr-1">
          {filtered.map((p: any) => (
            <button key={p.id} onClick={() => onSelect(p)}
              className="w-full flex items-center gap-3 p-3 bg-navy-800 border border-navy-600 rounded-xl hover:border-brand-green/50 hover:bg-navy-700 transition-all text-left">
              <div className="w-9 h-9 rounded-lg bg-brand-green/10 border border-brand-green/20 flex items-center justify-center flex-shrink-0">
                <Building2 size={16} className="text-brand-green"/>
              </div>
              <div className="flex-1 min-w-0">
                <div className="font-bold text-slate-200 text-sm truncate">{p.businessName}</div>
                <div className="text-xs text-slate-500">{p.category} · {p.city}{p.country ? ` (${p.country})` : ''}</div>
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

const EMPTY_PRODUCT: Omit<ProductFormData, 'proId'> = {
  name: '', description: '', price: '', currency: 'XOF',
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

  const { data: proCategories = [] } = useQuery({
    queryKey: ['admin-catalogue-categories', form.proId],
    queryFn: () => api.get(`/admin/catalogue/${form.proId}`).then((r: any) => {
      const d = r?.data?.data ?? r?.data
      return d?.categories ?? []
    }),
    enabled: !!form.proId,
    staleTime: 30_000,
  })

  const handleProChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    onChange({ ...form, proId: e.target.value, categoryId: '' })
  }

  const [uploading, setUploading] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)

  const handleImageUpload = async (file: File) => {
    if (!file) return
    const fd = new FormData()
    fd.append('image', file)
    setUploading(true)
    try {
      const res: any = await api.post('/admin/catalogue/upload-image', fd)
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
          <label className="label">Catégorie</label>
          <select value={form.categoryId} onChange={set('categoryId')} className="input w-full" disabled={!form.proId}>
            <option value="">Sans catégorie</option>
            {proCategories.map((c: any) => (
              <option key={c.id} value={c.id}>{c.name?.fr || c.name?.en || c.name}</option>
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
            <img src={form.imageUrl} alt="" className="w-16 h-16 rounded-xl object-cover border border-navy-600"/>
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
            className="w-full flex items-center justify-center gap-2 p-6 border-2 border-dashed border-navy-600 rounded-xl text-slate-500 hover:text-slate-300 hover:border-navy-500 transition-colors disabled:opacity-50">
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
          <p className="text-xs text-slate-600 font-semibold italic">Ex : Petite / Grande, Sans sauce…</p>
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
          <span className="text-sm font-semibold text-slate-300">Disponible à la commande</span>
        </label>
        <label className="flex items-center gap-2 cursor-pointer">
          <input type="checkbox" checked={form.isMenu}
            onChange={e => onChange({ ...form, isMenu: e.target.checked })}
            className="w-4 h-4 rounded accent-brand-green"/>
          <span className="text-sm font-semibold text-slate-300">Menu du jour</span>
        </label>
      </div>
    </div>
  )
}

// ─── Vue catalogue d'un pro ───────────────────────────────────────────────────

const CatalogueView: React.FC<{ pro: any; onBack: () => void }> = ({ pro, onBack }) => {
  const qc = useQueryClient()
  const confirm = useConfirm()
  const qKey = ['admin-catalogue', pro.id]

  const [openCats, setOpenCats] = useState<Set<string>>(new Set())
  const [catModal, setCatModal] = useState(false)
  const [productModal, setProductModal] = useState<{ mode: 'create' | 'edit'; product?: any } | null>(null)
  const [catForm, setCatForm] = useState({ name: '', icon: '' })
  const [productForm, setProductForm] = useState<ProductFormData>(EMPTY_PRODUCT)

  const [priceMin, setPriceMin]       = useState('')
  const [priceMax, setPriceMax]       = useState('')
  const [availFilter, setAvailFilter] = useState<'all' | 'available' | 'unavailable'>('all')

  const { data, isLoading } = useQuery({
    queryKey: qKey,
    queryFn: () => api.get(`/admin/catalogue/${pro.id}`).then((r: any) => r?.data?.data ?? r?.data),
  })
  const categories: any[] = data?.categories ?? []

  const toggleCat = (id: string) => setOpenCats(prev => { const s = new Set(prev); s.has(id) ? s.delete(id) : s.add(id); return s })
  const hasProductFilters = priceMin || priceMax || availFilter !== 'all'

  const filterProducts = (products: any[]) => {
    if (!hasProductFilters) return products
    return products.filter(p => {
      if (priceMin && p.price < Number(priceMin)) return false
      if (priceMax && p.price > Number(priceMax)) return false
      if (availFilter === 'available'   && !p.isAvailable) return false
      if (availFilter === 'unavailable' && p.isAvailable)  return false
      return true
    })
  }

  const visibleCategories = useMemo(() => {
    if (!hasProductFilters) return categories
    return categories
      .map(cat => ({ ...cat, products: filterProducts(cat.products ?? []) }))
      .filter(cat => cat.products.length > 0)
  }, [categories, priceMin, priceMax, availFilter])

  const totalProducts = categories.reduce((sum: number, c: any) => sum + (c.products?.length ?? 0), 0)

  const createCatMutation = useMutation({
    mutationFn: () => api.post(`/admin/catalogue/${pro.id}/categories`, { name: { fr: catForm.name, en: catForm.name }, icon: catForm.icon || undefined }),
    onSuccess: () => { toast.success('Catégorie créée'); qc.invalidateQueries({queryKey: qKey}); setCatModal(false); setCatForm({ name: '', icon: '' }) },
    onError: (e: any) => toast.error(e.message),
  })

  const deleteCatMutation = useMutation({
    mutationFn: (id: string) => api.delete(`/admin/catalogue/categories/${id}`),
    onSuccess: () => { toast.success('Catégorie supprimée'); qc.invalidateQueries({queryKey: qKey}) },
    onError: (e: any) => toast.error(e.message),
  })

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
    mutationFn: () => api.post(`/admin/catalogue/${productForm.proId || pro.id}/products`, buildProductPayload(productForm)),
    onSuccess: () => {
      toast.success('Produit créé')
      qc.invalidateQueries({queryKey: qKey})
      if (productForm.proId && productForm.proId !== pro.id) {
        qc.invalidateQueries({queryKey: ['admin-catalogue', productForm.proId]})
      }
      setProductModal(null)
    },
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

  const openCreateProduct = (categoryId?: string) => {
    setProductForm({ ...EMPTY_PRODUCT, proId: pro.id, categoryId: categoryId || '' })
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

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center gap-4 flex-wrap">
        <button onClick={onBack} className="p-2 text-slate-400 hover:text-white hover:bg-navy-700 rounded-xl transition-colors text-sm font-bold">
          ← Retour
        </button>
        <div className="flex items-center gap-3 flex-1">
          <div className="w-10 h-10 rounded-xl bg-brand-green/10 border border-brand-green/20 flex items-center justify-center flex-shrink-0">
            <Building2 size={18} className="text-brand-green"/>
          </div>
          <div>
            <div className="font-black text-slate-100">{pro.businessName}</div>
            <div className="text-xs text-slate-500">
              {pro.category} · {pro.city}
              {' · '}{totalProducts} produit{totalProducts !== 1 ? 's' : ''}
              {' · '}{categories.length} catégorie{categories.length !== 1 ? 's' : ''}
            </div>
          </div>
        </div>
        <button onClick={() => { setCatForm({ name: '', icon: '' }); setCatModal(true) }} className="btn-secondary">
          <FolderPlus size={15}/> Catégorie
        </button>
        <button onClick={() => openCreateProduct()} className="btn-primary">
          <Plus size={15}/> Produit
        </button>
      </div>

      {/* Filtres */}
      <div className="card p-4 flex flex-wrap gap-3 items-end">
        <div className="flex flex-col gap-1 min-w-[120px]">
          <label className="label text-[10px]">Prix min</label>
          <input className="input text-sm" type="number" min="0" value={priceMin} onChange={e => setPriceMin(e.target.value)} placeholder="0"/>
        </div>
        <div className="flex flex-col gap-1 min-w-[120px]">
          <label className="label text-[10px]">Prix max</label>
          <input className="input text-sm" type="number" min="0" value={priceMax} onChange={e => setPriceMax(e.target.value)} placeholder="∞"/>
        </div>
        <div className="flex flex-col gap-1 min-w-[160px]">
          <label className="label text-[10px]">Disponibilité</label>
          <select className="input text-sm" value={availFilter} onChange={e => setAvailFilter(e.target.value as any)}>
            <option value="all">Tous</option>
            <option value="available">Disponibles</option>
            <option value="unavailable">Indisponibles</option>
          </select>
        </div>
        {hasProductFilters && (
          <>
            <button onClick={() => { setPriceMin(''); setPriceMax(''); setAvailFilter('all') }} className="btn-secondary text-xs px-3 self-end">
              Réinitialiser
            </button>
            <div className="self-end text-xs text-slate-500 font-semibold">
              {visibleCategories.reduce((s, c) => s + c.products.length, 0)} résultat{visibleCategories.reduce((s, c) => s + c.products.length, 0) !== 1 ? 's' : ''}
            </div>
          </>
        )}
      </div>

      {/* Catalogue */}
      {isLoading ? (
        <div className="space-y-3">{Array.from({length:3}).map((_,i) => <div key={i} className="h-16 bg-navy-800 rounded-xl animate-pulse"/>)}</div>
      ) : categories.length === 0 ? (
        <div className="card p-12 text-center">
          <p className="text-slate-500 font-semibold mb-4">Aucune catégorie pour le moment</p>
          <button onClick={() => { setCatForm({ name: '', icon: '' }); setCatModal(true) }} className="btn-primary mx-auto">
            <FolderPlus size={15}/> Créer la première catégorie
          </button>
        </div>
      ) : hasProductFilters && visibleCategories.length === 0 ? (
        <div className="card p-12 text-center">
          <p className="text-slate-500 font-semibold">Aucun produit ne correspond aux filtres</p>
        </div>
      ) : (
        <div className="space-y-3">
          {(hasProductFilters ? visibleCategories : categories).map((cat: any) => {
            const products = cat.products ?? []
            const isOpen = hasProductFilters || openCats.has(cat.id)
            return (
              <div key={cat.id} className="card overflow-hidden">
                <div className="flex items-center gap-3 p-4 cursor-pointer select-none hover:bg-navy-800/50 transition-colors"
                  onClick={() => !hasProductFilters && toggleCat(cat.id)}>
                  {!hasProductFilters && (isOpen ? <ChevronDown size={16} className="text-slate-400"/> : <ChevronRight size={16} className="text-slate-400"/>)}
                  <span className="text-base">{cat.icon || '📦'}</span>
                  <span className="font-bold text-slate-200 flex-1">{cat.name?.fr || cat.name?.en || 'Catégorie'}</span>
                  <span className="text-xs text-slate-500 font-semibold">
                    {hasProductFilters ? `${products.length} / ${cat.products?.length ?? 0}` : `${products.length}`} produit{products.length !== 1 ? 's' : ''}
                  </span>
                  <button onClick={(e) => { e.stopPropagation(); openCreateProduct(cat.id) }}
                    className="p-1.5 text-brand-green hover:bg-brand-green/10 rounded-lg" title="Ajouter un produit">
                    <Plus size={14}/>
                  </button>
                  <button onClick={async (e) => {
                    e.stopPropagation()
                    const ok = await confirm({
                      title: 'Supprimer cette catégorie ?',
                      message: `« ${cat.name?.fr ?? cat.name} » sera supprimée. Les produits qu'elle contient resteront sans catégorie.`,
                      variant: 'danger', confirmLabel: 'Supprimer',
                    })
                    if (ok) deleteCatMutation.mutate(cat.id)
                  }}
                    className="p-1.5 text-red-400 hover:bg-red-500/10 rounded-lg" title="Supprimer">
                    <Trash2 size={14}/>
                  </button>
                </div>

                {isOpen && (
                  <div className="border-t border-navy-700">
                    {products.length === 0 ? (
                      <div className="px-8 py-6 text-center">
                        <p className="text-slate-500 text-sm font-semibold mb-2">Aucun produit dans cette catégorie</p>
                        <button onClick={() => openCreateProduct(cat.id)} className="btn-secondary text-xs py-1.5 px-3">
                          <Plus size={12}/> Ajouter un produit
                        </button>
                      </div>
                    ) : (
                      products.map((product: any, idx: number) => {
                        const variantCount = Array.isArray(product.variants) ? product.variants.length : 0
                        return (
                          <div key={product.id} className={`flex items-center gap-4 px-6 py-3 ${idx < products.length - 1 ? 'border-b border-navy-800' : ''} hover:bg-navy-800/30 transition-colors`}>
                            {product.imageUrl ? (
                              <img src={product.imageUrl} alt="" className="w-10 h-10 rounded-lg object-cover flex-shrink-0 border border-navy-700"/>
                            ) : (
                              <div className="w-10 h-10 rounded-lg bg-navy-700 flex items-center justify-center flex-shrink-0 text-lg">🍽️</div>
                            )}
                            <div className="flex-1 min-w-0">
                              <div className="font-semibold text-slate-200 text-sm truncate flex items-center gap-2">
                                {product.name?.fr || product.name?.en || '—'}
                                {product.isMenu && <span className="text-[10px] font-bold text-amber-400 bg-amber-400/10 px-1.5 py-0.5 rounded">MENU</span>}
                              </div>
                              <div className="flex items-center gap-3 mt-0.5">
                                {product.description?.fr && (
                                  <span className="text-xs text-slate-500 truncate max-w-[180px]">{product.description.fr}</span>
                                )}
                                {variantCount > 0 && (
                                  <span className="text-[10px] font-bold text-blue-400 bg-blue-400/10 px-1.5 py-0.5 rounded flex-shrink-0">
                                    {variantCount} variante{variantCount !== 1 ? 's' : ''}
                                  </span>
                                )}
                                {product.stock != null && (
                                  <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded flex items-center gap-1 flex-shrink-0 ${product.stock === 0 ? 'text-red-400 bg-red-400/10' : 'text-slate-400 bg-navy-700'}`}>
                                    <Package size={9}/> {product.stock}
                                  </span>
                                )}
                              </div>
                            </div>
                            <span className="font-black text-brand-green text-sm w-24 text-right flex-shrink-0">{formatCFA(product.price)}</span>
                            <button onClick={() => toggleProductMutation.mutate(product.id)}
                              title={product.isAvailable ? 'Masquer' : 'Rendre disponible'}
                              className={`p-1.5 rounded-lg transition-colors ${product.isAvailable ? 'text-green-400 hover:bg-green-500/10' : 'text-slate-500 hover:bg-navy-700'}`}>
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
                      })
                    )}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}

      {/* Modal — Nouvelle catégorie */}
      <Modal open={catModal} onClose={() => setCatModal(false)} title="Nouvelle catégorie" size="sm">
        <div className="space-y-4">
          <div>
            <label className="label">Nom de la catégorie *</label>
            <input value={catForm.name} onChange={e => setCatForm(f => ({...f, name: e.target.value}))}
              placeholder="Ex : Plats, Boissons, Entrées…" className="input w-full"/>
          </div>
          <div>
            <label className="label">Icône (emoji, optionnel)</label>
            <input value={catForm.icon} onChange={e => setCatForm(f => ({...f, icon: e.target.value}))}
              placeholder="🍕" className="input w-full"/>
          </div>
          <div className="flex gap-3 pt-1">
            <button onClick={() => setCatModal(false)} className="btn-secondary flex-1 justify-center">Annuler</button>
            <button onClick={() => createCatMutation.mutate()} disabled={!catForm.name.trim() || createCatMutation.isPending}
              className="btn-primary flex-1 justify-center">
              <FolderPlus size={15}/> Créer
            </button>
          </div>
        </div>
      </Modal>

      {/* Modal — Créer / Éditer produit */}
      <Modal open={!!productModal} onClose={() => setProductModal(null)}
        title={productModal?.mode === 'edit' ? 'Modifier le produit' : 'Nouveau produit'} size="lg">
        <div className="space-y-4 max-h-[72vh] overflow-y-auto pr-1">
          <ProductForm
            form={productForm}
            onChange={setProductForm}
            mode={productModal?.mode ?? 'create'}
          />
          <div className="flex gap-3 pt-1 sticky bottom-0 bg-navy-900 pb-1">
            <button onClick={() => setProductModal(null)} className="btn-secondary flex-1 justify-center">Annuler</button>
            <button
              onClick={() => productModal?.mode === 'edit'
                ? updateProductMutation.mutate(productModal.product.id)
                : createProductMutation.mutate()
              }
              disabled={!productForm.name.trim() || !productForm.price || createProductMutation.isPending || updateProductMutation.isPending}
              className="btn-primary flex-1 justify-center">
              <Plus size={15}/> {productModal?.mode === 'edit' ? 'Enregistrer' : 'Créer le produit'}
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
    <div>
      <div className="card p-6">
        <h2 className="text-base font-black text-slate-100 mb-1">Gérer un catalogue</h2>
        <p className="text-sm text-slate-500 font-semibold mb-5">Sélectionne un établissement pour créer ou modifier son catalogue</p>
        <ProSelector onSelect={setSelectedPro}/>
      </div>
    </div>
  )
}
