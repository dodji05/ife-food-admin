import React, { useState, useMemo } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import api from '../../services/api'
import { Modal } from '../../components/ui/Modal'
import { Badge } from '../../components/ui/Badge'
import { formatCFA } from '../../utils/format'
import { Search, Plus, Pencil, Trash2, Eye, EyeOff, FolderPlus, ChevronDown, ChevronRight, Building2, X } from 'lucide-react'
import toast from 'react-hot-toast'
import { useConfirm } from '../../hooks/useConfirm'

// ─── Sélecteur de professionnel ──────────────────────────────────────────────

const ProSelector: React.FC<{ onSelect: (pro: any) => void }> = ({ onSelect }) => {
  const [search, setSearch]       = useState('')
  const [filterCountry, setFilterCountry] = useState('')
  const [filterCity, setFilterCity]       = useState('')

  const { data: pros = [], isLoading } = useQuery({
    queryKey: ['all-professionals-selector'],
    queryFn: () => api.get('/admin/professionals?limit=200').then((r: any) => r?.data?.data ?? r?.data ?? []),
  })

  // Seuls les pros créés par l'admin ET n'ayant pas encore effectué leur première connexion
  // sont éligibles à la gestion de catalogue par l'admin.
  const eligible = useMemo(() => pros.filter((p: any) => p.user?.createdByAdmin === true && !p.user?.lastLoginAt), [pros])

  const filtered = useMemo(() => eligible.filter((p: any) => {
    const matchSearch  = !search        || p.businessName?.toLowerCase().includes(search.toLowerCase()) || p.city?.toLowerCase().includes(search.toLowerCase())
    const matchCountry = !filterCountry || p.country?.toLowerCase().includes(filterCountry.toLowerCase())
    const matchCity    = !filterCity    || p.city?.toLowerCase().includes(filterCity.toLowerCase())
    return matchSearch && matchCountry && matchCity
  }), [eligible, search, filterCountry, filterCity])

  const hasFilters = search || filterCountry || filterCity
  const reset = () => { setSearch(''); setFilterCountry(''); setFilterCity('') }

  return (
    <div className="space-y-4">
      {/* Barre de recherche */}
      <div className="relative">
        <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500"/>
        <input value={search} onChange={e => setSearch(e.target.value)}
          placeholder="Rechercher par nom d'établissement…"
          className="input pl-9 h-9 text-sm w-full"/>
        {search && (
          <button onClick={() => setSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300">
            <X size={14}/>
          </button>
        )}
      </div>

      {/* Filtres pays / ville */}
      <div className="flex gap-3">
        <div className="flex-1">
          <label className="label text-[10px]">Pays</label>
          <input className="input text-sm" value={filterCountry} onChange={e => setFilterCountry(e.target.value)} placeholder="BJ, SN…"/>
        </div>
        <div className="flex-1">
          <label className="label text-[10px]">Ville</label>
          <input className="input text-sm" value={filterCity} onChange={e => setFilterCity(e.target.value)} placeholder="Cotonou…"/>
        </div>
        {hasFilters && (
          <div className="flex items-end">
            <button onClick={reset} className="btn-secondary text-xs px-3 py-2">
              Réinitialiser
            </button>
          </div>
        )}
      </div>

      {/* Compteur */}
      <div className="flex items-center justify-between text-xs">
        <span className="text-slate-500 font-semibold">
          {hasFilters
            ? `${filtered.length} établissement${filtered.length !== 1 ? 's' : ''} trouvé${filtered.length !== 1 ? 's' : ''}`
            : `${eligible.length} établissement${eligible.length !== 1 ? 's' : ''} éligible${eligible.length !== 1 ? 's' : ''}`}
        </span>
        <span className="text-slate-600">Créés par l'admin · avant 1ère connexion</span>
      </div>

      {/* Liste */}
      {isLoading ? (
        <div className="space-y-2">{Array.from({length:4}).map((_,i) => <div key={i} className="h-14 bg-navy-800 rounded-xl animate-pulse"/>)}</div>
      ) : eligible.length === 0 ? (
        <div className="text-center py-8 space-y-2">
          <p className="text-slate-500 text-sm">Aucun établissement éligible.</p>
          <p className="text-slate-600 text-xs">Seuls les établissements créés par un admin et n'ayant pas encore effectué leur première connexion peuvent être gérés ici.</p>
        </div>
      ) : filtered.length === 0 ? (
        <p className="text-slate-500 text-sm text-center py-8">Aucun résultat pour ces filtres.</p>
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

// ─── Vue catalogue d'un pro ───────────────────────────────────────────────────

const CatalogueView: React.FC<{ pro: any; onBack: () => void }> = ({ pro, onBack }) => {
  const qc = useQueryClient()
  const confirm = useConfirm()
  const qKey = ['admin-catalogue', pro.id]

  const [openCats, setOpenCats] = useState<Set<string>>(new Set())
  const [catModal, setCatModal] = useState(false)
  const [productModal, setProductModal] = useState<{ mode: 'create' | 'edit'; categoryId?: string; product?: any } | null>(null)
  const [catForm, setCatForm] = useState({ name: '', icon: '' })
  const [productForm, setProductForm] = useState({ name: '', description: '', price: '', currency: 'XOF', isAvailable: true, categoryId: '' })

  // Filtres produits
  const [priceMin, setPriceMin]             = useState('')
  const [priceMax, setPriceMax]             = useState('')
  const [availFilter, setAvailFilter]       = useState<'all' | 'available' | 'unavailable'>('all')

  const { data, isLoading } = useQuery({
    queryKey: qKey,
    queryFn: () => api.get(`/admin/catalogue/${pro.id}`).then((r: any) => r?.data),
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

  const resetProductFilters = () => { setPriceMin(''); setPriceMax(''); setAvailFilter('all') }

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

  const createProductMutation = useMutation({
    mutationFn: () => api.post(`/admin/catalogue/${pro.id}/products`, {
      name: { fr: productForm.name, en: productForm.name },
      description: productForm.description ? { fr: productForm.description, en: productForm.description } : undefined,
      price: Number(productForm.price),
      currency: productForm.currency,
      isAvailable: productForm.isAvailable,
      categoryId: productForm.categoryId || undefined,
    }),
    onSuccess: () => { toast.success('Produit créé'); qc.invalidateQueries({queryKey: qKey}); setProductModal(null) },
    onError: (e: any) => toast.error(e.message),
  })

  const updateProductMutation = useMutation({
    mutationFn: (id: string) => api.patch(`/admin/catalogue/products/${id}`, {
      name: { fr: productForm.name, en: productForm.name },
      description: productForm.description ? { fr: productForm.description, en: productForm.description } : undefined,
      price: Number(productForm.price),
      currency: productForm.currency,
      isAvailable: productForm.isAvailable,
      categoryId: productForm.categoryId || undefined,
    }),
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

  const openCreateProduct = (categoryId: string) => {
    setProductForm({ name: '', description: '', price: '', currency: 'XOF', isAvailable: true, categoryId })
    setProductModal({ mode: 'create', categoryId })
  }

  const openEditProduct = (product: any) => {
    setProductForm({
      name: product.name?.fr || product.name?.en || '',
      description: product.description?.fr || '',
      price: String(product.price),
      currency: product.currency ?? 'XOF',
      isAvailable: product.isAvailable,
      categoryId: product.categoryId ?? '',
    })
    setProductModal({ mode: 'edit', product })
  }

  const totalProducts = categories.reduce((sum: number, c: any) => sum + (c.products?.length ?? 0), 0)

  // Expand all categories when filters are active so results are visible
  const visibleCategories = useMemo(() => {
    if (!hasProductFilters) return categories
    return categories
      .map(cat => ({ ...cat, products: filterProducts(cat.products ?? []) }))
      .filter(cat => cat.products.length > 0)
  }, [categories, priceMin, priceMax, availFilter])

  return (
    <div className="space-y-5">
      {/* Header pro */}
      <div className="flex items-center gap-4">
        <button onClick={onBack} className="p-2 text-slate-400 hover:text-white hover:bg-navy-700 rounded-xl transition-colors text-sm font-bold">
          ← Retour
        </button>
        <div className="flex items-center gap-3 flex-1">
          <div className="w-10 h-10 rounded-xl bg-brand-green/10 border border-brand-green/20 flex items-center justify-center">
            <Building2 size={18} className="text-brand-green"/>
          </div>
          <div>
            <div className="font-black text-slate-100">{pro.businessName}</div>
            <div className="text-xs text-slate-500">{pro.category} · {pro.city} · {totalProducts} produit{totalProducts !== 1 ? 's' : ''} · {categories.length} catégorie{categories.length !== 1 ? 's' : ''}</div>
          </div>
        </div>
        <button onClick={() => { setCatForm({ name: '', icon: '' }); setCatModal(true) }} className="btn-primary">
          <FolderPlus size={15}/> Nouvelle catégorie
        </button>
        <button onClick={() => openCreateProduct('')} className="btn-secondary">
          <Plus size={15}/> Produit sans catégorie
        </button>
      </div>

      {/* Filtres produits */}
      <div className="card p-4 flex flex-wrap gap-3 items-end">
        <div className="flex flex-col gap-1 min-w-[120px]">
          <label className="label text-[10px]">Prix min (XOF)</label>
          <input className="input text-sm" type="number" min="0" value={priceMin} onChange={e => setPriceMin(e.target.value)} placeholder="0"/>
        </div>
        <div className="flex flex-col gap-1 min-w-[120px]">
          <label className="label text-[10px]">Prix max (XOF)</label>
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
          <button onClick={resetProductFilters} className="btn-secondary text-xs px-3 self-end">
            Réinitialiser
          </button>
        )}
        {hasProductFilters && (
          <div className="self-end text-xs text-slate-500 font-semibold">
            {visibleCategories.reduce((s, c) => s + c.products.length, 0)} produit{visibleCategories.reduce((s, c) => s + c.products.length, 0) !== 1 ? 's' : ''} correspondent
          </div>
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
            const products = hasProductFilters ? cat.products : (cat.products ?? [])
            const isOpen = hasProductFilters || openCats.has(cat.id)
            return (
              <div key={cat.id} className="card overflow-hidden">
                {/* En-tête catégorie */}
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
                      variant: 'danger',
                      confirmLabel: 'Supprimer',
                    })
                    if (ok) deleteCatMutation.mutate(cat.id)
                  }}
                    className="p-1.5 text-red-400 hover:bg-red-500/10 rounded-lg" title="Supprimer la catégorie">
                    <Trash2 size={14}/>
                  </button>
                </div>

                {/* Produits */}
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
                      products.map((product: any, idx: number) => (
                        <div key={product.id} className={`flex items-center gap-4 px-6 py-3 ${idx < products.length - 1 ? 'border-b border-navy-800' : ''} hover:bg-navy-800/30 transition-colors`}>
                          {product.imageUrl ? (
                            <img src={product.imageUrl} alt="" className="w-10 h-10 rounded-lg object-cover flex-shrink-0"/>
                          ) : (
                            <div className="w-10 h-10 rounded-lg bg-navy-700 flex items-center justify-center flex-shrink-0 text-lg">🍽️</div>
                          )}
                          <div className="flex-1 min-w-0">
                            <div className="font-semibold text-slate-200 text-sm truncate">{product.name?.fr || product.name?.en || '—'}</div>
                            {product.description?.fr && <div className="text-xs text-slate-500 truncate">{product.description.fr}</div>}
                          </div>
                          <span className="font-black text-brand-green text-sm w-24 text-right flex-shrink-0">{formatCFA(product.price)}</span>
                          <button onClick={() => toggleProductMutation.mutate(product.id)} title={product.isAvailable ? 'Masquer' : 'Rendre disponible'}
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
                              variant: 'danger',
                              confirmLabel: 'Supprimer',
                            })
                            if (ok) deleteProductMutation.mutate(product.id)
                          }}
                            className="p-1.5 text-red-400 hover:bg-red-500/10 rounded-lg">
                            <Trash2 size={14}/>
                          </button>
                        </div>
                      ))
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
        title={productModal?.mode === 'edit' ? 'Modifier le produit' : 'Nouveau produit'} size="md">
        <div className="space-y-4">
          <div>
            <label className="label">Nom du produit *</label>
            <input value={productForm.name} onChange={e => setProductForm(f => ({...f, name: e.target.value}))}
              placeholder="Ex : Poulet braisé, Riz sauce tomate…" className="input w-full"/>
          </div>
          <div>
            <label className="label">Description (optionnelle)</label>
            <textarea value={productForm.description} onChange={e => setProductForm(f => ({...f, description: e.target.value}))}
              placeholder="Ingrédients, allergènes, note…" className="input w-full h-20 resize-none text-sm"/>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">Prix *</label>
              <input type="number" min="0" value={productForm.price} onChange={e => setProductForm(f => ({...f, price: e.target.value}))}
                placeholder="1500" className="input w-full"/>
            </div>
            <div>
              <label className="label">Devise</label>
              <select value={productForm.currency} onChange={e => setProductForm(f => ({...f, currency: e.target.value}))} className="input w-full">
                <option value="XOF">XOF (FCFA)</option>
                <option value="EUR">EUR</option>
                <option value="USD">USD</option>
              </select>
            </div>
          </div>
          <div>
            <label className="label">Catégorie</label>
            <select value={productForm.categoryId} onChange={e => setProductForm(f => ({...f, categoryId: e.target.value}))} className="input w-full">
              <option value="">Sans catégorie</option>
              {categories.map((c: any) => (
                <option key={c.id} value={c.id}>{c.name?.fr || c.name?.en}</option>
              ))}
            </select>
          </div>
          <div className="flex items-center gap-3">
            <input type="checkbox" id="isAvailable" checked={productForm.isAvailable}
              onChange={e => setProductForm(f => ({...f, isAvailable: e.target.checked}))}
              className="w-4 h-4 rounded accent-brand-green"/>
            <label htmlFor="isAvailable" className="text-sm font-semibold text-slate-300 cursor-pointer">Disponible à la commande</label>
          </div>
          <div className="flex gap-3 pt-1">
            <button onClick={() => setProductModal(null)} className="btn-secondary flex-1 justify-center">Annuler</button>
            <button
              onClick={() => productModal?.mode === 'edit' ? updateProductMutation.mutate(productModal.product.id) : createProductMutation.mutate()}
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
    <div className="max-w-2xl">
      <div className="card p-6">
        <h2 className="text-base font-black text-slate-100 mb-1">Gérer un catalogue</h2>
        <p className="text-sm text-slate-500 font-semibold mb-5">Sélectionne un établissement pour créer ou modifier son catalogue</p>
        <ProSelector onSelect={setSelectedPro}/>
      </div>
    </div>
  )
}
