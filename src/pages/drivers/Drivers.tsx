import React, { useState, useMemo } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import api from '../../services/api'
import { DataTable } from '../../components/ui/DataTable'
import { Badge } from '../../components/ui/Badge'
import { Modal } from '../../components/ui/Modal'
import { ReferralTab } from '../../components/ui/ReferralTab'
import { formatDateTime, formatDate, formatCFA } from '../../utils/format'
import { useConfirm } from '../../hooks/useConfirm'
import { unwrap } from '../../utils/api'
import { COUNTRIES } from '../../constants/countries'
import {
  CheckCircle, XCircle, AlertTriangle, Truck, Phone, Mail,
  MapPin, FileText, Package, Plus, Trash2, Gift,
} from 'lucide-react'
import toast from 'react-hot-toast'

const VEHICLE_TYPES = ['BICYCLE', 'MOTORCYCLE', 'CAR', 'ON_FOOT']
const VEHICLE_LABELS: Record<string, string> = {
  BICYCLE: 'Vélo',
  MOTORCYCLE: 'Moto',
  CAR: 'Voiture',
  ON_FOOT: 'À pied',
}

const DRIVER_STATUSES = ['PENDING', 'VALIDATED', 'REJECTED', 'OFFLINE', 'ONLINE', 'BANNED']

const isEditableByAdmin = (user: any) => user?.createdByAdmin === true && !user?.lastLoginAt

interface DriverFormProps {
  initial?: any
  zones: any[]
  onSave: (dto: any) => void
  saving: boolean
  mode: 'create' | 'edit'
}

const DriverForm: React.FC<DriverFormProps> = ({ initial, zones, onSave, saving, mode }) => {
  const initialZoneIds: string[] = initial?.selectedZones?.map((sz: any) => sz.deliveryZoneId) ?? []

  const [form, setForm] = useState({
    name: initial?.user?.name ?? '',
    firstName: initial?.user?.firstName ?? '',
    phone: initial?.user?.phone ?? '',
    email: initial?.user?.email ?? '',
    pin: '',
    vehicleType: initial?.vehicleType ?? 'MOTORCYCLE',
    zoneCity: initial?.zoneCity ?? '',
    zoneCountry: initial?.zoneCountry ?? 'BJ',
    licensePlate: initial?.licensePlate ?? '',
    deliveryZoneIds: initialZoneIds,
  })

  const set = (k: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
    setForm(f => ({ ...f, [k]: e.target.value }))

  const handleCountryChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newCountry = e.target.value
    const compatibleZoneIds = zones
      .filter(z => z.country === newCountry)
      .map(z => z.id)
    setForm(f => ({
      ...f,
      zoneCountry: newCountry,
      deliveryZoneIds: f.deliveryZoneIds.filter(id => compatibleZoneIds.includes(id)),
    }))
  }

  const toggleZone = (zoneId: string) => {
    setForm(f => ({
      ...f,
      deliveryZoneIds: f.deliveryZoneIds.includes(zoneId)
        ? f.deliveryZoneIds.filter(id => id !== zoneId)
        : [...f.deliveryZoneIds, zoneId],
    }))
  }

  const filteredZones = zones.filter(z => !form.zoneCountry || z.country === form.zoneCountry)

  const Field = ({ label, children }: { label: string; children: React.ReactNode }) => (
    <div className="flex flex-col gap-1">
      <label className="label text-[11px]">{label}</label>
      {children}
    </div>
  )

  return (
    <form onSubmit={e => { e.preventDefault(); onSave(form) }} className="space-y-3">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <Field label="Nom">
          <input className="input" value={form.name} onChange={set('name')} placeholder="Nom"/>
        </Field>
        <Field label="Prénom">
          <input className="input" value={form.firstName} onChange={set('firstName')} placeholder="Prénom"/>
        </Field>
        {mode === 'create' && (
          <Field label="Téléphone *">
            <input className="input" value={form.phone} onChange={set('phone')} required placeholder="+229…"/>
          </Field>
        )}
        <Field label="Email">
          <input className="input" type="email" value={form.email} onChange={set('email')} placeholder="email@…"/>
        </Field>
        {mode === 'create' && (
          <Field label="PIN mobile (4-6 chiffres) — défaut : 0000">
            <input
              className="input font-mono tracking-widest"
              inputMode="numeric"
              pattern="[0-9]*"
              maxLength={6}
              value={form.pin}
              onChange={e => setForm(f => ({ ...f, pin: e.target.value.replace(/\D/g, '') }))}
              placeholder="ex: 1234"
            />
          </Field>
        )}
        <Field label="Véhicule">
          <select className="input" value={form.vehicleType} onChange={set('vehicleType')}>
            {VEHICLE_TYPES.map(v => <option key={v} value={v}>{VEHICLE_LABELS[v]}</option>)}
          </select>
        </Field>
        <Field label="Pays">
          <select className="input" value={form.zoneCountry} onChange={handleCountryChange}>
            {COUNTRIES.map(c => (
              <option key={c.code} value={c.code}>{c.name} ({c.code})</option>
            ))}
          </select>
        </Field>
        <Field label="Ville (zone)">
          <input className="input" value={form.zoneCity} onChange={set('zoneCity')} placeholder="Cotonou"/>
        </Field>
        <Field label="Plaque d'immat.">
          <input className="input" value={form.licensePlate} onChange={set('licensePlate')} placeholder="AB-123-BJ"/>
        </Field>
      </div>

      {/* Zones de livraison */}
      <div className="flex flex-col gap-2">
        <label className="label text-[11px]">
          Zones de livraison
          {filteredZones.length === 0 && form.zoneCountry && (
            <span className="ml-2 text-slate-500 font-normal">— aucune zone configurée pour ce pays</span>
          )}
        </label>
        {filteredZones.length > 0 && (
          <div className="flex flex-wrap gap-2 p-3 bg-navy-800/50 rounded-xl border border-navy-600">
            {filteredZones.map(zone => {
              const selected = form.deliveryZoneIds.includes(zone.id)
              return (
                <button
                  key={zone.id}
                  type="button"
                  onClick={() => toggleZone(zone.id)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all border ${
                    selected
                      ? 'bg-brand-green/20 border-brand-green text-brand-green'
                      : 'bg-navy-700 border-navy-600 text-slate-400 hover:text-slate-200 hover:border-navy-500'
                  }`}
                >
                  {zone.name}
                  {zone.fromCity && zone.toCity && (
                    <span className="ml-1 font-normal opacity-70">{zone.fromCity}→{zone.toCity}</span>
                  )}
                </button>
              )
            })}
          </div>
        )}
      </div>

      <button type="submit" disabled={saving} className="btn-primary w-full justify-center">
        {saving ? 'Enregistrement…' : mode === 'create' ? 'Créer le livreur' : 'Enregistrer les modifications'}
      </button>
    </form>
  )
}

export const Drivers: React.FC = () => {
  const [tab, setTab] = useState<'all' | 'pending' | 'active'>('all')
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [detailTab, setDetailTab] = useState<'info' | 'edit' | 'missions' | 'referral'>('info')
  const [rejectNote, setRejectNote] = useState('')
  const [showCreate, setShowCreate] = useState(false)

  // Filters
  const [filterCountry, setFilterCountry] = useState('')
  const [filterCity, setFilterCity] = useState('')
  const [filterVehicle, setFilterVehicle] = useState('')
  const [filterStatus, setFilterStatus] = useState('')

  const qc = useQueryClient()
  const confirm = useConfirm()

  const { data: deliveryZones = [] } = useQuery({
    queryKey: ['delivery-zones'],
    queryFn: () => api.get('/admin/delivery-zones').then((r: any) => {
      const d = unwrap(r)
      return Array.isArray(d) ? d : []
    }),
    staleTime: 5 * 60 * 1000,
  })

  const buildParams = () => {
    const p = new URLSearchParams()
    if (filterCountry) p.set('country', filterCountry)
    if (filterCity)    p.set('city', filterCity)
    if (filterVehicle) p.set('vehicleType', filterVehicle)
    if (filterStatus)  p.set('status', filterStatus)
    p.set('limit', '200')
    return p.toString()
  }

  const { data: allDrivers = [], isLoading: allLoading, refetch } = useQuery({
    queryKey: ['all-drivers', filterCountry, filterCity, filterVehicle, filterStatus],
    queryFn: () => api.get(`/admin/drivers?${buildParams()}`).then((r: any) => {
      const d = unwrap(r)
      return Array.isArray(d) ? d : []
    }),
  })

  const { data: pending = [], isLoading: pendingLoading } = useQuery({
    queryKey: ['pending-drivers'],
    queryFn: () => api.get('/admin/pending/drivers').then((r: any) => {
      if (Array.isArray(r)) return r
      if (Array.isArray(r?.data)) return r.data
      if (Array.isArray(r?.data?.data)) return r.data.data
      return []
    }),
    refetchInterval: 30000,
  })

  const { data: driverDetail } = useQuery({
    queryKey: ['driver-detail', selectedId],
    queryFn: () => api.get(`/admin/drivers/${selectedId}`).then(unwrap),
    enabled: !!selectedId,
  })

  const { data: missions = [], isLoading: missionsLoading } = useQuery({
    queryKey: ['driver-missions', selectedId],
    queryFn: () => api.get(`/admin/drivers/${selectedId}/missions`).then((r: any) => {
      const payload = unwrap(r)
      return Array.isArray(payload) ? payload : []
    }),
    enabled: !!selectedId && detailTab === 'missions',
  })

  const validateMutation = useMutation({
    mutationFn: ({ id, status, note }: { id: string; status: string; note?: string }) =>
      api.patch(`/admin/drivers/${id}/validate`, { status, note }),
    onSuccess: (_, vars) => {
      toast.success(vars.status === 'VALIDATED' ? 'Livreur validé' : 'Inscription refusée')
      qc.invalidateQueries({ queryKey: ['pending-drivers'] })
      qc.invalidateQueries({ queryKey: ['all-drivers'] })
      qc.invalidateQueries({ queryKey: ['driver-detail', vars.id] })
      setSelectedId(null)
    },
    onError: (e: any) => toast.error(e.message),
  })

  const createMutation = useMutation({
    mutationFn: (dto: any) => api.post('/admin/drivers', dto),
    onSuccess: () => {
      toast.success('Livreur créé !')
      qc.invalidateQueries({ queryKey: ['all-drivers'] })
      setShowCreate(false)
    },
    onError: (e: any) => toast.error(e?.response?.data?.message ?? e.message),
  })

  const updateMutation = useMutation({
    mutationFn: ({ id, dto }: { id: string; dto: any }) => api.patch(`/admin/drivers/${id}/info`, dto),
    onSuccess: (_, vars) => {
      toast.success('Livreur mis à jour')
      qc.invalidateQueries({ queryKey: ['all-drivers'] })
      qc.invalidateQueries({ queryKey: ['driver-detail', vars.id] })
      setDetailTab('info')
    },
    onError: (e: any) => toast.error(e?.response?.data?.message ?? e.message),
  })

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.delete(`/admin/drivers/${id}`),
    onSuccess: () => {
      toast.success('Livreur supprimé')
      qc.invalidateQueries({ queryKey: ['all-drivers'] })
      setSelectedId(null)
    },
    onError: (e: any) => toast.error(e?.response?.data?.message ?? e.message),
  })

  const openDetail = (row: any) => {
    setSelectedId(row.id)
    setDetailTab('info')
    setRejectNote('')
  }

  const activeCount = useMemo(
    () => allDrivers.filter((d: any) => d.status === 'VALIDATED' || d.status === 'ONLINE' || d.status === 'OFFLINE').length,
    [allDrivers]
  )
  const pendingCount = pending.length

  const displayedDrivers = useMemo(() => {
    if (tab === 'pending') return pending
    if (tab === 'active')  return allDrivers.filter((d: any) => d.status === 'VALIDATED' || d.status === 'ONLINE' || d.status === 'OFFLINE')
    return allDrivers
  }, [tab, allDrivers, pending])

  const selected = driverDetail

  const baseColumns = [
    {
      key: 'user', label: 'Livreur',
      sortable: true,
      sortValue: (r: any) => (r.user?.name ?? '').toLowerCase(),
      exportValue: (r: any) => `${r.user?.name ?? ''} ${r.user?.phone ? '(' + r.user.phone + ')' : ''}`.trim(),
      render: (r: any) => (
        <div>
          <div className="font-semibold text-slate-200">{r.user?.name || '—'}</div>
          <div className="text-xs text-slate-500">{r.user?.phone}</div>
        </div>
      ),
    },
    {
      key: 'vehicleType', label: 'Véhicule',
      sortable: true,
      exportValue: (r: any) => r.vehicleType ?? '',
      render: (r: any) => <span className="text-sm text-slate-300">{VEHICLE_LABELS[r.vehicleType] || r.vehicleType || '—'}</span>,
    },
    {
      key: 'zoneCity', label: 'Zone',
      sortable: true, hideOnMobile: true,
      exportValue: (r: any) => r.zoneCity ?? '',
      render: (r: any) => <span className="text-sm text-slate-400">{r.zoneCity || '—'}</span>,
    },
    {
      key: 'status', label: 'Statut',
      sortable: true,
      exportValue: (r: any) => r.status ?? 'PENDING',
      render: (r: any) => <Badge status={r.status || 'PENDING'}/>,
    },
    {
      key: 'createdAt', label: 'Inscription',
      sortable: true, hideOnMobile: true,
      sortValue: (r: any) => r.createdAt ? new Date(r.createdAt).getTime() : 0,
      exportValue: (r: any) => r.createdAt,
      render: (r: any) => <span className="text-xs text-slate-400">{formatDateTime(r.createdAt)}</span>,
    },
  ]

  const pendingColumns = [
    ...baseColumns,
    {
      key: 'actions', label: '', width: '90px',
      render: (r: any) => (
        <div className="flex gap-1" onClick={e => e.stopPropagation()}>
          <button
            title="Valider"
            onClick={async () => {
              const ok = await confirm({
                title: 'Valider ce livreur ?',
                message: `${r.user?.name ?? r.user?.phone ?? 'Ce livreur'} pourra immédiatement recevoir des missions.`,
                variant: 'info',
                confirmLabel: 'Valider',
              })
              if (ok) validateMutation.mutate({ id: r.id, status: 'VALIDATED' })
            }}
            className="p-1.5 text-green-400 hover:bg-green-500/10 rounded-lg transition-colors"
          ><CheckCircle size={15}/></button>
          <button
            title="Refuser"
            onClick={() => openDetail(r)}
            className="p-1.5 text-red-400 hover:bg-red-500/10 rounded-lg transition-colors"
          ><XCircle size={15}/></button>
        </div>
      ),
    },
  ]

  const toolbar = (
    <button onClick={() => setShowCreate(true)} className="btn-primary">
      <Plus size={15}/> Nouveau livreur
    </button>
  )

  return (
    <div className="space-y-4">
      {/* Alerte en attente */}
      {pending.length > 0 && (
        <div className="flex items-center gap-3 p-4 bg-yellow-500/10 border border-yellow-500/30 rounded-xl">
          <AlertTriangle size={18} className="text-yellow-400 flex-shrink-0"/>
          <span className="text-sm font-bold text-yellow-400">
            {pending.length} livreur{pending.length > 1 ? 's' : ''} en attente de validation
          </span>
        </div>
      )}

      {/* Filtres */}
      <div className="card p-4 flex flex-wrap gap-3 items-end">
        <div className="flex flex-col gap-1 min-w-[160px]">
          <label className="label text-[10px]">Pays</label>
          <select className="input text-sm" value={filterCountry} onChange={e => setFilterCountry(e.target.value)}>
            <option value="">Tous les pays</option>
            {COUNTRIES.map(c => (
              <option key={c.code} value={c.code}>{c.name} ({c.code})</option>
            ))}
          </select>
        </div>
        <div className="flex flex-col gap-1 min-w-[140px]">
          <label className="label text-[10px]">Ville</label>
          <input className="input text-sm" value={filterCity} onChange={e => setFilterCity(e.target.value)} placeholder="Cotonou"/>
        </div>
        <div className="flex flex-col gap-1 min-w-[140px]">
          <label className="label text-[10px]">Véhicule</label>
          <select className="input text-sm" value={filterVehicle} onChange={e => setFilterVehicle(e.target.value)}>
            <option value="">Tous</option>
            {VEHICLE_TYPES.map(v => <option key={v} value={v}>{VEHICLE_LABELS[v]}</option>)}
          </select>
        </div>
        <div className="flex flex-col gap-1 min-w-[140px]">
          <label className="label text-[10px]">Statut</label>
          <select className="input text-sm" value={filterStatus} onChange={e => setFilterStatus(e.target.value)}>
            <option value="">Tous</option>
            {DRIVER_STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
          </select>
        </div>
        <button onClick={() => { setFilterCountry(''); setFilterCity(''); setFilterVehicle(''); setFilterStatus('') }}
          className="btn-secondary text-xs px-3 self-end">
          Réinitialiser
        </button>
        <button onClick={() => refetch()} className="btn-primary text-xs px-3 self-end">
          Actualiser
        </button>
      </div>

      {/* Onglets compteurs */}
      <div className="flex gap-2">
        {([
          { key: 'all',     label: `Tous (${allDrivers.length})` },
          { key: 'pending', label: `En attente (${pendingCount})` },
          { key: 'active',  label: `Actifs (${activeCount})` },
        ] as const).map(({ key, label }) => (
          <button
            key={key}
            onClick={() => setTab(key)}
            className={`px-4 py-2 rounded-xl text-sm font-bold transition-all ${tab === key ? 'bg-brand-green text-white' : 'bg-navy-800 text-slate-400 border border-navy-600 hover:text-slate-200'}`}
          >
            {label}
          </button>
        ))}
      </div>

      {/* Table */}
      <div className="card p-5">
        <DataTable
          columns={tab === 'pending' ? pendingColumns : baseColumns}
          data={displayedDrivers}
          loading={tab === 'pending' ? pendingLoading : allLoading}
          onRowClick={openDetail}
          exportable
          exportFilename="livreurs"
          toolbar={toolbar}
        />
      </div>

      {/* Modale création */}
      <Modal open={showCreate} onClose={() => setShowCreate(false)} title="Nouveau livreur" size="lg">
        <DriverForm
          mode="create"
          zones={deliveryZones}
          onSave={dto => createMutation.mutate(dto)}
          saving={createMutation.isPending}
        />
      </Modal>

      {/* Modale détail */}
      <Modal open={!!selectedId} onClose={() => setSelectedId(null)} title="Fiche livreur" size="xl">
        {selected ? (
          <div className="space-y-4 max-h-[75vh] overflow-y-auto pr-1">
            {/* Header */}
            <div className="flex items-start justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-xl bg-brand-green/10 border border-brand-green/20 flex items-center justify-center flex-shrink-0">
                  <Truck size={20} className="text-brand-green"/>
                </div>
                <div>
                  <div className="font-black text-slate-100 text-base">{selected.user?.name || '—'}</div>
                  <div className="text-sm text-slate-400">{VEHICLE_LABELS[selected.vehicleType] || selected.vehicleType || '—'} · {selected.zoneCity || '—'}</div>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Badge status={selected.status || 'PENDING'}/>
                {isEditableByAdmin(selected.user) && (
                  <button
                    title="Supprimer"
                    onClick={async () => {
                      const ok = await confirm({
                        title: 'Supprimer ce livreur ?',
                        message: 'Le compte sera désactivé (BANNED). Cette action est irréversible.',
                        variant: 'danger',
                        confirmLabel: 'Supprimer',
                      })
                      if (ok) deleteMutation.mutate(selected.id)
                    }}
                    className="p-2 text-red-400 hover:bg-red-500/10 rounded-lg transition-colors"
                  ><Trash2 size={15}/></button>
                )}
              </div>
            </div>

            {/* Bannière lecture seule */}
            {!isEditableByAdmin(selected.user) && (
              <div className="flex items-center gap-2 px-3 py-2 bg-navy-700/40 border border-navy-600/40 rounded-xl text-xs text-slate-400 font-semibold">
                <span>🔒</span>
                <span>
                  {!selected.user?.createdByAdmin
                    ? 'Compte créé depuis l\'application mobile — profil en lecture seule.'
                    : 'Le livreur s\'est déjà connecté — profil non modifiable.'}
                </span>
              </div>
            )}

            {/* Validation rapide si PENDING */}
            {selected.status === 'PENDING' && (
              <div className="p-4 bg-yellow-500/10 border border-yellow-500/30 rounded-xl space-y-3">
                <div className="text-sm font-bold text-yellow-400">Dossier en attente de validation</div>
                <textarea
                  value={rejectNote}
                  onChange={e => setRejectNote(e.target.value)}
                  className="input h-16 resize-none text-sm"
                  placeholder="Note de refus (optionnel)…"
                />
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
                { key: 'info',     label: 'Informations' },
                { key: 'edit',     label: 'Modifier' },
                { key: 'missions', label: 'Missions' },
                { key: 'referral', label: 'Parrainage' },
              ] as const).filter(t => t.key !== 'edit' || isEditableByAdmin(selected.user)).map(({ key, label }) => (
                <button key={key} onClick={() => setDetailTab(key)}
                  className={`px-4 py-2 text-sm font-bold border-b-2 -mb-px transition-all whitespace-nowrap ${detailTab === key ? 'border-brand-green text-brand-green' : 'border-transparent text-slate-400 hover:text-slate-200'}`}>
                  {label}
                </button>
              ))}
            </div>

            {/* Onglet : Infos */}
            {detailTab === 'info' && (
              <div className="space-y-3">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="card-sm p-3 flex items-center gap-2">
                    <Phone size={14} className="text-slate-500 flex-shrink-0"/>
                    <div>
                      <div className="label text-[10px]">Téléphone</div>
                      <div className="text-sm font-semibold text-slate-200">{selected.user?.phone || '—'}</div>
                    </div>
                  </div>
                  <div className="card-sm p-3 flex items-center gap-2">
                    <Mail size={14} className="text-slate-500 flex-shrink-0"/>
                    <div>
                      <div className="label text-[10px]">Email</div>
                      <div className="text-sm font-semibold text-slate-200 truncate">{selected.user?.email || '—'}</div>
                    </div>
                  </div>
                  <div className="card-sm p-3 flex items-center gap-2">
                    <MapPin size={14} className="text-slate-500 flex-shrink-0"/>
                    <div>
                      <div className="label text-[10px]">Zone</div>
                      <div className="text-sm font-semibold text-slate-200">{selected.zoneCity || '—'}{selected.zoneCountry ? ` (${selected.zoneCountry})` : ''}</div>
                    </div>
                  </div>
                  <div className="card-sm p-3 flex items-center gap-2">
                    <Truck size={14} className="text-slate-500 flex-shrink-0"/>
                    <div>
                      <div className="label text-[10px]">Véhicule</div>
                      <div className="text-sm font-semibold text-slate-200">{VEHICLE_LABELS[selected.vehicleType] || selected.vehicleType || '—'}</div>
                    </div>
                  </div>
                  {selected.licensePlate && (
                    <div className="card-sm p-3 flex items-center gap-2 col-span-2">
                      <FileText size={14} className="text-slate-500 flex-shrink-0"/>
                      <div>
                        <div className="label text-[10px]">Plaque</div>
                        <div className="text-sm font-semibold text-slate-200">{selected.licensePlate}</div>
                      </div>
                    </div>
                  )}
                </div>

                {/* Zones de livraison assignées */}
                {selected.selectedZones?.length > 0 && (
                  <div className="card-sm p-3">
                    <div className="label mb-2 flex items-center gap-1.5"><MapPin size={13}/> Zones de livraison ({selected.selectedZones.length})</div>
                    <div className="flex flex-wrap gap-2">
                      {selected.selectedZones.map((sz: any) => (
                        <span key={sz.deliveryZoneId} className="px-2.5 py-1 bg-brand-green/10 border border-brand-green/30 text-brand-green text-xs font-bold rounded-lg">
                          {sz.deliveryZone?.name || sz.deliveryZoneId}
                          {sz.deliveryZone?.fromCity && sz.deliveryZone?.toCity && (
                            <span className="ml-1 font-normal opacity-70">{sz.deliveryZone.fromCity}→{sz.deliveryZone.toCity}</span>
                          )}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

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

                {(selected.tipStats?.tipCount > 0 || selected.tipStats) && (
                  <div className="card-sm p-3 border border-yellow-500/20">
                    <div className="label mb-2 flex items-center gap-1.5 text-yellow-400"><Gift size={13}/> Pourboires reçus</div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div className="text-center">
                        <div className="text-xs text-slate-500 font-bold mb-0.5">Total</div>
                        <div className="font-black text-yellow-300">{formatCFA(selected.tipStats?.totalTips ?? 0)}</div>
                      </div>
                      <div className="text-center">
                        <div className="text-xs text-slate-500 font-bold mb-0.5">Nombre</div>
                        <div className="font-black text-slate-200">{selected.tipStats?.tipCount ?? 0}</div>
                      </div>
                    </div>
                  </div>
                )}

                {selected.adminNote && (
                  <div className="card-sm p-3">
                    <div className="label text-[10px] mb-1">Note admin</div>
                    <div className="text-sm text-slate-300">{selected.adminNote}</div>
                  </div>
                )}

                <div className="text-xs text-slate-500 text-right">Inscrit le {formatDate(selected.createdAt)}</div>
              </div>
            )}

            {/* Onglet : Modifier */}
            {detailTab === 'edit' && (
              <DriverForm
                mode="edit"
                initial={selected}
                zones={deliveryZones}
                onSave={dto => updateMutation.mutate({ id: selected.id, dto })}
                saving={updateMutation.isPending}
              />
            )}

            {/* Onglet : Missions */}
            {detailTab === 'missions' && (
              <div>
                {missionsLoading
                  ? <div className="flex justify-center py-10"><div className="w-6 h-6 border-2 border-brand-green border-t-transparent rounded-full animate-spin"/></div>
                  : missions.length === 0
                    ? <div className="text-center py-10 text-slate-500 text-sm">Aucune mission pour l'instant</div>
                    : (
                      <div className="space-y-2 max-h-96 overflow-y-auto pr-1">
                        {missions.map((m: any) => (
                          <div key={m.id} className="card-sm p-3 flex items-center justify-between gap-3">
                            <div className="flex items-center gap-2 min-w-0">
                              <Package size={14} className="text-slate-500 flex-shrink-0"/>
                              <div className="min-w-0">
                                <div className="text-sm font-semibold text-slate-200 truncate">{m.professional?.businessName || '—'}</div>
                                <div className="text-xs text-slate-500">{m.client?.name || '—'} · {formatDate(m.createdAt)}</div>
                              </div>
                            </div>
                            <div className="flex items-center gap-2 flex-shrink-0">
                              <span className="text-xs font-bold text-slate-300">{formatCFA(m.totalAmount)}</span>
                              {m.tipAmount > 0 && (
                                <span className="text-[10px] font-bold text-yellow-400 bg-yellow-400/10 px-1.5 py-0.5 rounded-full flex items-center gap-0.5">
                                  <Gift size={9}/> {formatCFA(m.tipAmount)}
                                </span>
                              )}
                              <Badge status={m.status}/>
                            </div>
                          </div>
                        ))}
                      </div>
                    )
                }
              </div>
            )}

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
