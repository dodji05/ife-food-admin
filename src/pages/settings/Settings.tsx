import React, { useState, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  Save, Bell, Clock, Shield, Globe, DollarSign,
  Users, ChevronRight, Plus, Trash2, Pencil, CheckCircle, XCircle,
  Key, Eye, EyeOff, ChevronDown, ArrowUpDown,
} from 'lucide-react'
import api from '../../services/api'
import toast from 'react-hot-toast'
import { useConfirm } from '../../hooks/useConfirm'
import { Modal } from '../../components/ui/Modal'
import { Badge } from '../../components/ui/Badge'
import { formatDateTime } from '../../utils/format'
import { unwrap } from '../../utils/api'
import Toggle from '../../components/ui/Toggle'

// ─── Champs de credentials OTP par fournisseur ───────────────────────────────
type OtpCredField = { key: string; label: string; type: 'text' | 'password' | 'url'; placeholder?: string }
const OTP_CRED_FIELDS: Record<string, { label: string; fields: OtpCredField[] }> = {
  SMS: {
    label: 'SMS — Twilio',
    fields: [
      { key: 'accountSid',  label: 'Account SID',       type: 'text',     placeholder: 'ACxxxxxxxxxxxxxxxx' },
      { key: 'authToken',   label: 'Auth Token',         type: 'password' },
      { key: 'phoneNumber', label: 'Numéro expéditeur',  type: 'text',     placeholder: '+12015551234' },
    ],
  },
  WHATSAPP: {
    label: 'WhatsApp — Meta Business API',
    fields: [
      { key: 'apiUrl',      label: 'URL API',            type: 'url',      placeholder: 'https://graph.facebook.com/v19.0' },
      { key: 'phoneId',     label: 'ID téléphone',       type: 'text' },
      { key: 'accessToken', label: "Token d'accès",      type: 'password' },
    ],
  },
}

// ─── Onglet Général ──────────────────────────────────────────────────────────
const GeneralTab: React.FC = () => {
  const confirm = useConfirm()
  const qc = useQueryClient()
  const [otpChannel, setOtpChannel] = useState('SMS')
  const [cancelDelay, setCancelDelay] = useState('5')
  const [missionDelay, setMissionDelay] = useState('30')
  const [maintenanceMode, setMaintenanceMode] = useState(false)
  const [saving, setSaving] = useState(false)

  // OTP credentials
  const [maskedOtpCreds, setMaskedOtpCreds]   = useState<Record<string, Record<string, string>>>({})
  const [editedOtpCreds, setEditedOtpCreds]   = useState<Record<string, Record<string, string>>>({})
  const [otpCredsLoaded, setOtpCredsLoaded]   = useState(false)
  const [showOtpFields, setShowOtpFields]     = useState<Record<string, boolean>>({})
  const [expandedOtp, setExpandedOtp]         = useState<Record<string, boolean>>({ SMS: true })

  const { data: config, isLoading: configLoading } = useQuery({
    queryKey: ['platform-config'],
    queryFn: () => api.get('/admin/config/platform').then((r: any) => r.data),
    staleTime: Infinity,
    refetchOnWindowFocus: false,
  })

  useQuery({
    queryKey: ['otp-credentials'],
    queryFn: () => api.get('/admin/config/otp-credentials').then(unwrap),
    staleTime: Infinity,
    refetchOnWindowFocus: false,
    enabled: !otpCredsLoaded,
    select: (d: any) => {
      if (!otpCredsLoaded && d) {
        setMaskedOtpCreds(d)
        setOtpCredsLoaded(true)
      }
      return d
    },
  })

  const saveOtpCredsMutation = useMutation({
    mutationFn: () => {
      const payload: Record<string, Record<string, string>> = {}
      for (const channel of Object.keys(OTP_CRED_FIELDS)) {
        payload[channel] = {}
        for (const field of OTP_CRED_FIELDS[channel].fields) {
          const edited = editedOtpCreds[channel]?.[field.key]
          payload[channel][field.key] = edited !== undefined && edited !== '' ? edited : '__keep__'
        }
      }
      return api.put('/admin/config/otp-credentials', payload)
    },
    onSuccess: () => {
      toast.success('Clés OTP enregistrées !')
      setEditedOtpCreds({})
      setOtpCredsLoaded(false)
      qc.invalidateQueries({ queryKey: ['otp-credentials'] })
    },
    onError: (e: any) => toast.error(e.message),
  })

  const setOtpField = (channel: string, key: string, value: string) =>
    setEditedOtpCreds(prev => ({ ...prev, [channel]: { ...(prev[channel] ?? {}), [key]: value } }))

  useEffect(() => {
    if (config) {
      setOtpChannel(config.otpChannel ?? 'SMS')
      setCancelDelay(String(config.cancelDelay ?? 5))
      setMissionDelay(String(config.missionDelay ?? 30))
      setMaintenanceMode(config.maintenanceMode ?? false)
    }
  }, [config])

  const handleMaintenanceToggle = async (next: boolean) => {
    if (next) {
      const ok = await confirm({
        title: 'Activer le mode maintenance ?',
        message: "L'accès à la plateforme sera suspendu pour tous les clients, livreurs et professionnels. Seul l'admin restera connecté.",
        variant: 'danger',
        confirmLabel: 'Activer',
      })
      if (!ok) return
    }
    setMaintenanceMode(next)
  }

  const save = async () => {
    setSaving(true)
    try {
      await api.put('/admin/config/platform', { otpChannel, cancelDelay: Number(cancelDelay), missionDelay: Number(missionDelay), maintenanceMode })
      toast.success('Configuration enregistrée !')
    } catch (e: any) { toast.error(e.message) }
    finally { setSaving(false) }
  }

  if (configLoading) return <div className="space-y-5 max-w-2xl animate-pulse">{[...Array(3)].map((_, i) => <div key={i} className="card p-5 h-24 bg-navy-700/40"/>)}</div>

  return (
    <div className="space-y-5 max-w-2xl">
      {[
        { icon: Bell, title: 'Canal OTP', content: (
          <div className="flex gap-2">
            {['SMS', 'WHATSAPP'].map(c => (
              <button key={c} onClick={() => setOtpChannel(c)}
                className={`flex-1 py-2.5 rounded-xl text-sm font-bold ${otpChannel === c ? 'bg-brand-green text-white' : 'bg-navy-900 text-slate-400 border border-navy-700'}`}>
                {c === 'SMS' ? '📱 SMS' : '💬 WhatsApp'}
              </button>
            ))}
          </div>
        )},
        { icon: Clock, title: 'Délais métier', content: (
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label">Annulation client (min)</label>
              <input value={cancelDelay} onChange={e => setCancelDelay(e.target.value)} type="number" className="input"/>
            </div>
            <div>
              <label className="label">Acceptation mission livreur (sec)</label>
              <input value={missionDelay} onChange={e => setMissionDelay(e.target.value)} type="number" className="input"/>
            </div>
          </div>
        )},
        { icon: Shield, title: 'Maintenance', content: (
          <div className="flex items-center gap-4">
            <div className="flex-1">
              <div className="text-sm font-bold text-slate-200">Mode maintenance global</div>
              <div className="text-xs text-slate-500">Suspend temporairement l'accès à la plateforme</div>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input type="checkbox" checked={maintenanceMode} onChange={e => handleMaintenanceToggle(e.target.checked)} className="sr-only peer"/>
              <div className="w-11 h-6 bg-navy-700 rounded-full peer peer-checked:after:translate-x-5 peer-checked:bg-red-500 after:content-[''] after:absolute after:top-0.5 after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all"/>
            </label>
          </div>
        )},
      ].map(({ icon: Icon, title, content }, i) => (
        <div key={i} className="card p-5 space-y-4">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-brand-green/10 border border-brand-green/20 flex items-center justify-center">
              <Icon size={16} className="text-brand-green"/>
            </div>
            <h3 className="text-base font-black text-slate-100">{title}</h3>
          </div>
          {content}
        </div>
      ))}
      <button onClick={save} disabled={saving} className="btn-primary">
        <Save size={14}/> {saving ? 'Enregistrement…' : 'Enregistrer la configuration'}
      </button>

      {/* Clés API OTP */}
      <div className="card p-5 space-y-4">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-brand-green/10 border border-brand-green/20 flex items-center justify-center">
            <Key size={16} className="text-brand-green"/>
          </div>
          <h3 className="text-base font-black text-slate-100">Clés API — Canal OTP</h3>
          <span className="ml-auto text-[10px] text-slate-500 bg-navy-700 px-2 py-1 rounded-lg">SUPER_ADMIN uniquement</span>
        </div>
        <p className="text-xs text-slate-500">Laissez un champ vide pour conserver la valeur actuelle. Les valeurs affichées sont masquées.</p>

        <div className="space-y-3">
          {Object.entries(OTP_CRED_FIELDS).map(([channel, { label, fields }]) => {
            const isExpanded = expandedOtp[channel] ?? false
            const hasCreds = fields.some(f => {
              const v = maskedOtpCreds[channel]?.[f.key]
              return v && v !== '****'
            })
            return (
              <div key={channel} className="bg-navy-900 rounded-xl border border-navy-700 overflow-hidden">
                <button
                  type="button"
                  onClick={() => setExpandedOtp(p => ({ ...p, [channel]: !p[channel] }))}
                  className="w-full flex items-center gap-3 p-3 hover:bg-navy-800 transition-colors text-left">
                  <span className="text-xl flex-shrink-0">{channel === 'SMS' ? '📱' : '💬'}</span>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-bold text-slate-200">{label}</div>
                    {hasCreds
                      ? <div className="text-[10px] text-brand-green font-semibold">Clés configurées</div>
                      : <div className="text-[10px] text-slate-500">Aucune clé enregistrée</div>
                    }
                  </div>
                  {isExpanded
                    ? <ChevronDown size={14} className="text-slate-400 flex-shrink-0"/>
                    : <ChevronRight size={14} className="text-slate-400 flex-shrink-0"/>
                  }
                </button>

                {isExpanded && (
                  <div className="px-4 pb-4 pt-1 space-y-3 border-t border-navy-700">
                    {fields.map(field => {
                      const fieldId = `${channel}__${field.key}`
                      const maskedVal = maskedOtpCreds[channel]?.[field.key] ?? ''
                      const editVal   = editedOtpCreds[channel]?.[field.key] ?? ''
                      const isVisible = showOtpFields[fieldId] ?? false
                      return (
                        <div key={field.key} className="space-y-1">
                          <label className="text-xs font-semibold text-slate-400">{field.label}</label>
                          <div className="flex gap-2">
                            <input
                              type={field.type === 'url' ? 'url' : (field.type === 'password' && !isVisible ? 'password' : 'text')}
                              value={editVal}
                              onChange={e => setOtpField(channel, field.key, e.target.value)}
                              placeholder={maskedVal || field.placeholder || 'Non configuré'}
                              className="input flex-1 text-sm font-mono"
                              autoComplete="off"
                            />
                            {field.type === 'password' && (
                              <button type="button"
                                onClick={() => setShowOtpFields(p => ({ ...p, [fieldId]: !p[fieldId] }))}
                                className="p-2 text-slate-400 hover:text-slate-200 hover:bg-navy-700 rounded-lg flex-shrink-0">
                                {isVisible ? <EyeOff size={14}/> : <Eye size={14}/>}
                              </button>
                            )}
                          </div>
                        </div>
                      )
                    })}
                  </div>
                )}
              </div>
            )
          })}
        </div>

        <button
          onClick={() => saveOtpCredsMutation.mutate()}
          disabled={saveOtpCredsMutation.isPending}
          className="btn-primary w-full justify-center">
          <Save size={14}/> Enregistrer les clés OTP
        </button>
      </div>
    </div>
  )
}

type CountrySort = 'active-first' | 'inactive-first' | 'name-asc' | 'name-desc'

// ─── Onglet Pays ─────────────────────────────────────────────────────────────
const CountriesTab: React.FC = () => {
  const qc = useQueryClient()
  const [sort, setSort] = useState<CountrySort>('active-first')

  const { data, isLoading } = useQuery({
    queryKey: ['admin-countries'],
    queryFn: () => api.get('/admin/config/countries').then(unwrap),
  })

  const countries: any[] = Array.isArray(data) ? data : []

  const sorted = [...countries].sort((a, b) => {
    if (sort === 'active-first')   return (b.isActive ? 1 : 0) - (a.isActive ? 1 : 0) || a.name.localeCompare(b.name)
    if (sort === 'inactive-first') return (a.isActive ? 1 : 0) - (b.isActive ? 1 : 0) || a.name.localeCompare(b.name)
    if (sort === 'name-desc')      return b.name.localeCompare(a.name)
    return a.name.localeCompare(b.name)
  })

  const toggleMutation = useMutation({
    mutationFn: (code: string) => api.patch(`/admin/config/countries/${code}/toggle`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin-countries'] }),
    onError: (e: any) => toast.error(e.message),
  })

  const SORT_OPTIONS: { value: CountrySort; label: string }[] = [
    { value: 'active-first',   label: 'Actifs en premier' },
    { value: 'inactive-first', label: 'Inactifs en premier' },
    { value: 'name-asc',       label: 'Nom A → Z' },
    { value: 'name-desc',      label: 'Nom Z → A' },
  ]

  return (
    <div className="space-y-4 max-w-xl">
      <div className="flex items-center justify-between gap-3">
        <p className="text-xs text-slate-500">Les pays désactivés n'apparaissent pas dans les filtres et l'app mobile.</p>
        <div className="flex items-center gap-1.5 flex-shrink-0">
          <ArrowUpDown size={13} className="text-slate-500" />
          <select
            value={sort}
            onChange={e => setSort(e.target.value as CountrySort)}
            className="text-xs bg-navy-800 border border-navy-600 text-slate-300 rounded-lg px-2 py-1 cursor-pointer focus:outline-none focus:border-brand-green"
          >
            {SORT_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
        </div>
      </div>
      {isLoading
        ? <div className="flex justify-center py-10"><div className="w-6 h-6 border-2 border-brand-green border-t-transparent rounded-full animate-spin"/></div>
        : (
          <div className="card divide-y divide-navy-700 overflow-hidden max-h-[520px] overflow-y-auto">
            {sorted.map((c: any) => (
              <div key={c.code} className={`flex items-center gap-3 px-4 py-3 transition-colors ${c.isActive ? '' : 'opacity-50'}`}>
                <span className="text-xl flex-shrink-0">{c.emoji ?? '🌍'}</span>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-bold text-slate-200">{c.name}</div>
                  <div className="text-xs text-slate-500">{c.code} · {c.currency}</div>
                </div>
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full mr-2 ${c.isActive ? 'bg-green-500/10 text-green-400' : 'bg-slate-700 text-slate-500'}`}>
                  {c.isActive ? 'Actif' : 'Inactif'}
                </span>
                <Toggle
                  checked={c.isActive}
                  onChange={() => toggleMutation.mutate(c.code)}
                  disabled={toggleMutation.isPending}
                />
              </div>
            ))}
          </div>
        )
      }
    </div>
  )
}

type CurrencySort = 'code-asc' | 'code-desc' | 'rate-asc' | 'rate-desc'

// ─── Onglet Devises ───────────────────────────────────────────────────────────
const CurrenciesTab: React.FC = () => {
  const qc = useQueryClient()
  const [rates, setRates] = useState<Record<string, string>>({})
  const [loaded, setLoaded] = useState(false)
  const [sort, setSort] = useState<CurrencySort>('code-asc')

  const { data, isLoading } = useQuery({
    queryKey: ['admin-currencies'],
    queryFn: () => api.get('/admin/config/currencies').then(unwrap),
    staleTime: Infinity,
    refetchOnWindowFocus: false,
    select: (d: any) => {
      if (!loaded && d?.rates) {
        const m: Record<string, string> = {}
        d.rates.forEach((r: any) => { m[r.fromCurrency] = String(r.rate) })
        setRates(m)
        setLoaded(true)
      }
      return d
    },
  })

  const saveMutation = useMutation({
    mutationFn: () => api.put('/admin/config/currencies', {
      rates: Object.entries(rates).map(([fromCurrency, rate]) => ({ fromCurrency, rate: Number(rate) })),
    }),
    onSuccess: () => { toast.success('Taux enregistrés !'); qc.invalidateQueries({ queryKey: ['admin-currencies'] }) },
    onError: (e: any) => toast.error(e.message),
  })

  const currencies: any[] = data?.rates ?? []

  const sorted = [...currencies].sort((a, b) => {
    if (sort === 'code-desc') return b.fromCurrency.localeCompare(a.fromCurrency)
    if (sort === 'rate-asc')  return (Number(rates[a.fromCurrency]) || a.rate) - (Number(rates[b.fromCurrency]) || b.rate)
    if (sort === 'rate-desc') return (Number(rates[b.fromCurrency]) || b.rate) - (Number(rates[a.fromCurrency]) || a.rate)
    return a.fromCurrency.localeCompare(b.fromCurrency)
  })

  const SORT_OPTIONS: { value: CurrencySort; label: string }[] = [
    { value: 'code-asc',  label: 'Code A → Z' },
    { value: 'code-desc', label: 'Code Z → A' },
    { value: 'rate-asc',  label: 'Taux croissant' },
    { value: 'rate-desc', label: 'Taux décroissant' },
  ]

  return (
    <div className="space-y-4 max-w-xl">
      <div className="card p-4 flex items-center gap-3 border border-brand-green/20">
        <div className="w-8 h-8 rounded-lg bg-brand-green/10 flex items-center justify-center flex-shrink-0">
          <DollarSign size={16} className="text-brand-green"/>
        </div>
        <div>
          <div className="text-sm font-black text-slate-100">Devise de base : XOF</div>
          <div className="text-xs text-slate-500">Franc CFA Ouest-Africain — toutes les conversions sont relatives au XOF.</div>
        </div>
      </div>

      <div className="flex justify-end">
        <div className="flex items-center gap-1.5">
          <ArrowUpDown size={13} className="text-slate-500" />
          <select
            value={sort}
            onChange={e => setSort(e.target.value as CurrencySort)}
            className="text-xs bg-navy-800 border border-navy-600 text-slate-300 rounded-lg px-2 py-1 cursor-pointer focus:outline-none focus:border-brand-green"
          >
            {SORT_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
        </div>
      </div>

      {isLoading
        ? <div className="flex justify-center py-10"><div className="w-6 h-6 border-2 border-brand-green border-t-transparent rounded-full animate-spin"/></div>
        : (
          <div className="card divide-y divide-navy-700 overflow-hidden max-h-[520px] overflow-y-auto">
            {sorted.map((r: any) => (
              <div key={r.fromCurrency} className="flex items-center gap-4 px-4 py-3">
                <div className="w-12 text-center">
                  <span className="text-xs font-black text-slate-300 bg-navy-700 px-2 py-1 rounded-lg">{r.fromCurrency}</span>
                </div>
                <div className="flex-1 flex items-center gap-1.5 text-xs text-slate-500">
                  <span>1 {r.fromCurrency}</span>
                  <ChevronRight size={12}/>
                  <span className="font-bold text-slate-300">X XOF</span>
                </div>
                <div className="flex items-center gap-2">
                  <input
                    type="number" min="0" step="0.001"
                    value={rates[r.fromCurrency] ?? ''}
                    onChange={e => setRates(prev => ({ ...prev, [r.fromCurrency]: e.target.value }))}
                    className="input w-28 text-sm text-right"
                    placeholder="0.000"
                  />
                  <span className="text-xs text-slate-500 font-semibold w-8">XOF</span>
                </div>
              </div>
            ))}
          </div>
        )
      }

      <button onClick={() => saveMutation.mutate()} disabled={saveMutation.isPending} className="btn-primary">
        <Save size={14}/> {saveMutation.isPending ? 'Enregistrement…' : 'Enregistrer les taux'}
      </button>
    </div>
  )
}

// ─── Onglet Comptes admin ─────────────────────────────────────────────────────
const LEVEL_LABELS: Record<string, string> = {
  SUPER_ADMIN: 'Super Admin', ADMIN: 'Admin', SUPPORT: 'Support',
}
const LEVEL_COLORS: Record<string, string> = {
  SUPER_ADMIN: 'text-yellow-400 bg-yellow-400/10',
  ADMIN: 'text-brand-green bg-brand-green/10',
  SUPPORT: 'text-blue-400 bg-blue-400/10',
  MODERATOR: 'text-purple-400 bg-purple-400/10',
  ANALYST: 'text-slate-400 bg-slate-700',
}

type AdminForm = { name: string; firstName: string; email: string; phone: string; level: string; password: string }
const emptyForm = (): AdminForm => ({ name: '', firstName: '', email: '', phone: '', level: 'ADMIN', password: '' })

const AdminsTab: React.FC = () => {
  const qc = useQueryClient()
  const confirm = useConfirm()
  const [showModal, setShowModal] = useState(false)
  const [editing, setEditing] = useState<any | null>(null)
  const [form, setForm] = useState<AdminForm>(emptyForm())

  const { data, isLoading } = useQuery({
    queryKey: ['admin-accounts'],
    queryFn: () => api.get('/admin/admins').then(unwrap),
  })
  const admins: any[] = Array.isArray(data) ? data : []

  const createMutation = useMutation({
    mutationFn: (dto: any) => api.post('/admin/admins', dto).then(unwrap),
    onSuccess: () => { toast.success('Compte créé !'); qc.invalidateQueries({ queryKey: ['admin-accounts'] }); setShowModal(false) },
    onError: (e: any) => toast.error(e.message),
  })

  const updateMutation = useMutation({
    mutationFn: ({ id, dto }: { id: string; dto: any }) => api.patch(`/admin/admins/${id}`, dto).then(unwrap),
    onSuccess: () => { toast.success('Compte mis à jour !'); qc.invalidateQueries({ queryKey: ['admin-accounts'] }); setShowModal(false) },
    onError: (e: any) => toast.error(e.message),
  })

  const statusMutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: string }) => api.patch(`/admin/admins/${id}/status`, { status }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['admin-accounts'] }) },
    onError: (e: any) => toast.error(e.message),
  })

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.delete(`/admin/admins/${id}`),
    onSuccess: () => { toast.success('Compte supprimé'); qc.invalidateQueries({ queryKey: ['admin-accounts'] }) },
    onError: (e: any) => toast.error(e.message),
  })

  const openCreate = () => { setEditing(null); setForm(emptyForm()); setShowModal(true) }
  const openEdit = (a: any) => {
    setEditing(a)
    setForm({ name: a.name ?? '', firstName: a.firstName ?? '', email: a.email ?? '', phone: a.phone ?? '', level: a.admin?.level ?? 'ADMIN', password: '' })
    setShowModal(true)
  }

  const handleSubmit = () => {
    if (!form.name || !form.email || !form.phone) { toast.error('Nom, email et téléphone sont requis'); return }
    if (!editing && (!form.password || form.password.length < 8)) { toast.error('Le mot de passe doit contenir au minimum 8 caractères'); return }
    if (editing) updateMutation.mutate({ id: editing.id, dto: { name: form.name, firstName: form.firstName, email: form.email, phone: form.phone, level: form.level } })
    else createMutation.mutate(form)
  }

  const handleDelete = async (a: any) => {
    const ok = await confirm({ title: 'Supprimer ce compte ?', message: `${a.name} (${a.email}) sera définitivement supprimé.`, variant: 'danger', confirmLabel: 'Supprimer' })
    if (ok) deleteMutation.mutate(a.id)
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-xs text-slate-500">Gérez les accès au dashboard administrateur.</p>
        <button onClick={openCreate} className="btn-primary text-xs px-3 gap-1.5"><Plus size={13}/> Nouveau compte</button>
      </div>

      {isLoading
        ? <div className="flex justify-center py-10"><div className="w-6 h-6 border-2 border-brand-green border-t-transparent rounded-full animate-spin"/></div>
        : admins.length === 0
          ? <div className="card p-8 text-center text-slate-500 text-sm">Aucun compte admin</div>
          : (
            <div className="card divide-y divide-navy-700 overflow-hidden">
              {admins.map((a: any) => (
                <div key={a.id} className={`flex items-center gap-3 px-4 py-3 ${a.status === 'SUSPENDED' ? 'opacity-50' : ''}`}>
                  <div className="w-9 h-9 rounded-xl bg-navy-700 flex items-center justify-center flex-shrink-0">
                    <span className="text-base font-black text-brand-green">{(a.name ?? '?')[0].toUpperCase()}</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-sm font-bold text-slate-200">{a.firstName ? `${a.firstName} ${a.name}` : a.name}</span>
                      <span className={`text-[10px] font-black px-2 py-0.5 rounded-full ${LEVEL_COLORS[a.admin?.level] ?? 'text-slate-400 bg-navy-700'}`}>
                        {LEVEL_LABELS[a.admin?.level] ?? a.admin?.level ?? '—'}
                      </span>
                      {a.status === 'SUSPENDED' && <span className="text-[10px] font-bold text-red-400 bg-red-400/10 px-2 py-0.5 rounded-full">Suspendu</span>}
                    </div>
                    <div className="text-xs text-slate-500 truncate">{a.email} · {a.phone}</div>
                    <div className="text-[10px] text-slate-600">{formatDateTime(a.createdAt)}</div>
                  </div>
                  <div className="flex items-center gap-1 flex-shrink-0">
                    <button title="Modifier" onClick={() => openEdit(a)} className="p-1.5 text-slate-400 hover:text-white hover:bg-navy-700 rounded-lg">
                      <Pencil size={13}/>
                    </button>
                    {a.status === 'SUSPENDED'
                      ? <button title="Réactiver" onClick={() => statusMutation.mutate({ id: a.id, status: 'ACTIVE' })} className="p-1.5 text-green-400 hover:bg-green-500/10 rounded-lg"><CheckCircle size={13}/></button>
                      : <button title="Suspendre" onClick={() => statusMutation.mutate({ id: a.id, status: 'SUSPENDED' })} className="p-1.5 text-yellow-400 hover:bg-yellow-500/10 rounded-lg"><XCircle size={13}/></button>
                    }
                    <button title="Supprimer" onClick={() => handleDelete(a)} className="p-1.5 text-red-400 hover:bg-red-500/10 rounded-lg">
                      <Trash2 size={13}/>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )
      }

      <Modal open={showModal} onClose={() => setShowModal(false)} title={editing ? 'Modifier le compte' : 'Nouveau compte admin'}>
        <div className="space-y-3 p-1">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="label text-[10px]">Prénom</label>
              <input className="input" value={form.firstName} onChange={e => setForm(f => ({ ...f, firstName: e.target.value }))} placeholder="Jean"/>
            </div>
            <div>
              <label className="label text-[10px]">Nom *</label>
              <input className="input" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="Dupont"/>
            </div>
          </div>
          <div>
            <label className="label text-[10px]">Email *</label>
            <input type="email" className="input" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} placeholder="admin@example.com"/>
          </div>
          <div>
            <label className="label text-[10px]">Téléphone *</label>
            <input className="input" value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} placeholder="+22967000000"/>
          </div>
          <div>
            <label className="label text-[10px]">Rôle</label>
            <select className="input" value={form.level} onChange={e => setForm(f => ({ ...f, level: e.target.value }))}>
              {Object.entries(LEVEL_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
            </select>
          </div>
          {!editing && (
            <div>
              <label className="label text-[10px]">Mot de passe * <span className="text-slate-600 font-normal">(min. 8 caractères)</span></label>
              <input type="password" autoComplete="new-password" className="input" value={form.password} onChange={e => setForm(f => ({ ...f, password: e.target.value }))} placeholder="••••••••"/>
            </div>
          )}
          <div className="flex gap-3 pt-2">
            <button className="btn-secondary flex-1" onClick={() => setShowModal(false)}>Annuler</button>
            <button className="btn-primary flex-1" onClick={handleSubmit} disabled={createMutation.isPending || updateMutation.isPending}>
              {editing ? 'Enregistrer' : 'Créer le compte'}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  )
}

// ─── Onglet Rôles ─────────────────────────────────────────────────────────────
const ROLES_MATRIX = [
  {
    role: 'SUPER_ADMIN', label: 'Super Admin', color: 'text-yellow-400 border-yellow-400/30 bg-yellow-400/5',
    desc: 'Accès total à toutes les fonctionnalités sans restriction.',
    perms: ['Dashboard', 'Analytics', 'Commandes', 'Clients', 'Professionnels', 'Livreurs', 'Catalogue', 'Paiements', 'Contenu', 'Codes promo', 'Parrainage', 'Frais livraison', 'Comptes admin', 'Configuration'],
  },
  {
    role: 'ADMIN', label: 'Admin', color: 'text-brand-green border-brand-green/30 bg-brand-green/5',
    desc: 'Accès complet sauf la gestion des comptes administrateurs.',
    perms: ['Dashboard', 'Analytics', 'Commandes', 'Clients', 'Professionnels', 'Livreurs', 'Catalogue', 'Paiements', 'Contenu', 'Codes promo', 'Parrainage', 'Frais livraison', 'Configuration'],
  },
  {
    role: 'SUPPORT', label: 'Support', color: 'text-blue-400 border-blue-400/30 bg-blue-400/5',
    desc: 'Accès limité au support utilisateur. Peut valider les comptes professionnels et livreurs.',
    perms: ['Clients', 'Professionnels', 'Livreurs', 'Commandes', 'Catalogue', 'Contenu', 'Validation comptes'],
  },
]

const RolesTab: React.FC = () => (
  <div className="space-y-4 max-w-2xl">
    <p className="text-xs text-slate-500">Les rôles définissent les sections accessibles dans le dashboard. Le rôle est attribué à la création du compte dans l'onglet "Comptes admin".</p>
    {ROLES_MATRIX.map(r => (
      <div key={r.role} className={`card p-5 border ${r.color}`}>
        <div className="flex items-center gap-3 mb-3">
          <span className={`text-xs font-black px-2.5 py-1 rounded-lg border ${r.color}`}>{r.label}</span>
          <span className="text-xs text-slate-400">{r.desc}</span>
        </div>
        <div className="flex flex-wrap gap-1.5">
          {r.perms.map(p => (
            <span key={p} className="text-[11px] font-semibold px-2 py-0.5 rounded-md bg-navy-700 text-slate-300 flex items-center gap-1">
              <CheckCircle size={10} className="text-brand-green flex-shrink-0"/> {p}
            </span>
          ))}
        </div>
      </div>
    ))}
  </div>
)

// ─── Page principale ──────────────────────────────────────────────────────────
type Tab = 'general' | 'countries' | 'currencies' | 'admins' | 'roles'

const TABS: { key: Tab; label: string; Icon: React.ElementType }[] = [
  { key: 'general',    label: 'Général',        Icon: Shield },
  { key: 'countries',  label: 'Pays',           Icon: Globe },
  { key: 'currencies', label: 'Devises',        Icon: DollarSign },
  { key: 'admins',     label: 'Comptes admin',  Icon: Users },
  { key: 'roles',      label: 'Rôles',          Icon: Shield },
]

export const Settings: React.FC = () => {
  const [tab, setTab] = useState<Tab>('general')

  return (
    <div className="space-y-5">
      {/* Tab bar */}
      <div className="flex gap-1 border-b border-navy-700 overflow-x-auto pb-0">
        {TABS.map(({ key, label, Icon }) => (
          <button key={key} onClick={() => setTab(key)}
            className={`flex items-center gap-2 px-4 py-2.5 text-sm font-bold border-b-2 -mb-px transition-all whitespace-nowrap ${tab === key ? 'border-brand-green text-brand-green' : 'border-transparent text-slate-400 hover:text-slate-200'}`}>
            <Icon size={14}/>
            {label}
          </button>
        ))}
      </div>

      {tab === 'general'    && <GeneralTab/>}
      {tab === 'countries'  && <CountriesTab/>}
      {tab === 'currencies' && <CurrenciesTab/>}
      {tab === 'admins'     && <AdminsTab/>}
      {tab === 'roles'      && <RolesTab/>}
    </div>
  )
}
