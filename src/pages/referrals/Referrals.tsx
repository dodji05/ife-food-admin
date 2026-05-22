import React, { useState, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import QRCode from 'qrcode'
import api from '../../services/api'
import { DataTable } from '../../components/ui/DataTable'
import { Badge } from '../../components/ui/Badge'
import { Modal } from '../../components/ui/Modal'
import { formatDateTime, formatCFA } from '../../utils/format'
import { unwrap } from '../../utils/api'
import {
  Gift, Users, Clock, CheckCircle, TrendingUp, Save,
  Copy, Check, QrCode, Share2, Link2, BarChart3, Trophy,
  RefreshCw, Filter,
} from 'lucide-react'
import toast from 'react-hot-toast'

const REFERRAL_BASE_URL = 'https://app.ifefd.com/join'

const MONTH_LABELS: Record<string, string> = {
  '01': 'Jan', '02': 'Fév', '03': 'Mar', '04': 'Avr',
  '05': 'Mai', '06': 'Jun', '07': 'Jul', '08': 'Aoû',
  '09': 'Sep', '10': 'Oct', '11': 'Nov', '12': 'Déc',
}


function useQRDataUrl(text: string) {
  const [dataUrl, setDataUrl] = useState('')
  useEffect(() => {
    if (!text) { setDataUrl(''); return }
    QRCode.toDataURL(text, { width: 240, margin: 2, color: { dark: '#e2e8f0', light: '#0a1628' } })
      .then(setDataUrl).catch(() => setDataUrl(''))
  }, [text])
  return dataUrl
}

// ─── Panneau QR Code d'un lien ────────────────────────────────────────────────
const LinkQRPanel: React.FC<{ user: any; onClose: () => void }> = ({ user, onClose }) => {
  const [copied, setCopied] = useState<'code' | 'link' | null>(null)
  const url = `${REFERRAL_BASE_URL}/${user.referralCode}`
  const qrDataUrl = useQRDataUrl(url)

  const copy = async (text: string, type: 'code' | 'link') => {
    await navigator.clipboard.writeText(text)
    setCopied(type)
    toast.success('Copié !')
    setTimeout(() => setCopied(null), 2000)
  }

  const share = async () => {
    if (navigator.share) {
      await navigator.share({ title: 'Rejoins IFE Food !', url }).catch(() => {})
    } else {
      await copy(url, 'link')
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-brand-green/10 border border-brand-green/20 flex items-center justify-center flex-shrink-0">
          <span className="text-brand-green font-black text-sm">{(user.firstName || user.name || '?')[0].toUpperCase()}</span>
        </div>
        <div>
          <div className="font-black text-slate-100">{[user.firstName, user.name].filter(Boolean).join(' ') || '—'}</div>
          <div className="text-xs text-slate-500 font-mono">{user.phone}</div>
        </div>
      </div>

      <div className="card-sm p-4">
        <div className="text-xs text-slate-500 font-bold mb-2">Code de parrainage</div>
        <div className="flex items-center gap-3">
          <span className="flex-1 font-black text-2xl text-brand-green tracking-widest">{user.referralCode}</span>
          <button onClick={() => copy(user.referralCode, 'code')}
            className="p-2 text-slate-400 hover:text-white hover:bg-navy-700 rounded-lg transition-all">
            {copied === 'code' ? <Check size={16} className="text-brand-green"/> : <Copy size={16}/>}
          </button>
        </div>
      </div>

      <div className="card-sm p-4">
        <div className="text-xs text-slate-500 font-bold mb-2">Lien de parrainage</div>
        <div className="flex items-center gap-2">
          <span className="flex-1 text-xs font-mono text-slate-300 truncate">{url}</span>
          <button onClick={() => copy(url, 'link')}
            className="p-2 text-slate-400 hover:text-white hover:bg-navy-700 rounded-lg transition-all flex-shrink-0">
            {copied === 'link' ? <Check size={16} className="text-brand-green"/> : <Copy size={16}/>}
          </button>
          <button onClick={share}
            className="p-2 text-slate-400 hover:text-white hover:bg-navy-700 rounded-lg transition-all flex-shrink-0">
            <Share2 size={16}/>
          </button>
        </div>
      </div>

      <div className="card-sm p-4 flex flex-col items-center gap-3">
        <div className="text-xs text-slate-500 font-bold self-start">QR Code</div>
        {qrDataUrl
          ? <img src={qrDataUrl} alt="QR Code" className="rounded-xl" width={200} height={200}/>
          : <div className="w-48 h-48 rounded-xl bg-navy-700 flex items-center justify-center">
              <QrCode size={40} className="text-slate-600 animate-pulse"/>
            </div>
        }
        {qrDataUrl && (
          <a href={qrDataUrl} download={`parrainage-${user.referralCode}.png`}
            className="btn-secondary text-xs px-3 gap-2">
            Télécharger le QR
          </a>
        )}
      </div>
    </div>
  )
}

// ─── Page principale ──────────────────────────────────────────────────────────
export const Referrals: React.FC = () => {
  const qc = useQueryClient()
  const [rewardAmount, setRewardAmount] = useState<string>('')
  const [enabled, setEnabled] = useState(true)
  const [configLoaded, setConfigLoaded] = useState(false)
  const [activeTab, setActiveTab] = useState<'stats' | 'links' | 'history'>('stats')
  const [statusFilter, setStatusFilter] = useState('')
  const [linkSearch, setLinkSearch] = useState('')
  const [selectedLink, setSelectedLink] = useState<any>(null)
  const [generateUserId, setGenerateUserId] = useState('')

  const { data: referralData, isLoading, isFetching, refetch } = useQuery({
    queryKey: ['referrals'],
    queryFn: () => api.get('/admin/referrals').then(unwrap),
  })

  const { data: linksData, isLoading: linksLoading, refetch: refetchLinks } = useQuery({
    queryKey: ['referral-links'],
    queryFn: () => api.get('/admin/referral-links').then(unwrap),
    enabled: activeTab === 'links',
  })

  useQuery({
    queryKey: ['referral-config'],
    queryFn: () => api.get('/admin/referral-config').then(unwrap),
    staleTime: Infinity,
    refetchOnWindowFocus: false,
    enabled: !configLoaded,
    select: (d: any) => {
      if (!configLoaded) {
        setRewardAmount(String(d?.rewardAmount ?? 500))
        setEnabled(d?.enabled ?? true)
        setConfigLoaded(true)
      }
      return d
    },
  })

  const configMutation = useMutation({
    mutationFn: () => api.patch('/admin/referral-config', { rewardAmount: Number(rewardAmount), enabled }),
    onSuccess: () => { toast.success('Configuration sauvegardée'); qc.invalidateQueries({ queryKey: ['referral-config'] }) },
    onError: (e: any) => toast.error(e.message),
  })

  const generateMutation = useMutation({
    mutationFn: (userId: string) => api.post(`/admin/users/${userId}/referral-code`, {}),
    onSuccess: () => {
      toast.success('Code de parrainage généré !')
      setGenerateUserId('')
      refetchLinks()
    },
    onError: (e: any) => toast.error(e.message),
  })

  const stats = referralData?.stats
  const referrals: any[] = referralData?.referrals ?? []
  const topReferrers: any[] = referralData?.topReferrers ?? []
  const monthly: any[] = referralData?.monthly ?? []
  const links: any[] = Array.isArray(linksData) ? linksData : []

  const filteredReferrals = referrals.filter(r => !statusFilter || r.status === statusFilter)
  const filteredLinks = links.filter(u => {
    if (!linkSearch) return true
    const q = linkSearch.toLowerCase()
    return [u.firstName, u.name, u.phone, u.referralCode].join(' ').toLowerCase().includes(q)
  })

  const maxMonthly = Math.max(...monthly.map(m => m.created), 1)

  const referralColumns = [
    {
      key: 'referrer', label: 'Parrain',
      sortable: true,
      sortValue: (r: any) => [r.referrer?.firstName, r.referrer?.name].filter(Boolean).join(' ').toLowerCase(),
      exportValue: (r: any) => `${[r.referrer?.firstName, r.referrer?.name].filter(Boolean).join(' ')} (${r.referrer?.phone ?? ''})`,
      render: (r: any) => (
        <div>
          <div className="font-semibold text-slate-200 text-sm">{[r.referrer?.firstName, r.referrer?.name].filter(Boolean).join(' ') || '—'}</div>
          <div className="text-xs text-slate-500 font-mono">{r.referrer?.phone || '—'}</div>
        </div>
      ),
    },
    {
      key: 'referee', label: 'Filleul',
      sortable: true,
      sortValue: (r: any) => [r.referee?.firstName, r.referee?.name].filter(Boolean).join(' ').toLowerCase(),
      exportValue: (r: any) => `${[r.referee?.firstName, r.referee?.name].filter(Boolean).join(' ')} (${r.referee?.phone ?? ''})`,
      render: (r: any) => (
        <div>
          <div className="font-semibold text-slate-200 text-sm">{[r.referee?.firstName, r.referee?.name].filter(Boolean).join(' ') || '—'}</div>
          <div className="text-xs text-slate-500 font-mono">{r.referee?.phone || '—'}</div>
        </div>
      ),
    },
    { key: 'status', label: 'Statut',
      sortable: true,
      exportValue: (r: any) => r.status,
      render: (r: any) => <Badge status={r.status}/> },
    {
      key: 'rewardedAt', label: 'Converti le',
      sortable: true, hideOnMobile: true,
      sortValue: (r: any) => r.rewardedAt ? new Date(r.rewardedAt).getTime() : 0,
      exportValue: (r: any) => r.rewardedAt ?? '',
      render: (r: any) => <span className="text-xs text-slate-400">{r.rewardedAt ? formatDateTime(r.rewardedAt) : '—'}</span>,
    },
    { key: 'createdAt', label: 'Date',
      sortable: true, hideOnMobile: true,
      sortValue: (r: any) => r.createdAt ? new Date(r.createdAt).getTime() : 0,
      exportValue: (r: any) => r.createdAt,
      render: (r: any) => <span className="text-xs text-slate-400">{formatDateTime(r.createdAt)}</span> },
  ]

  return (
    <div className="space-y-5">
      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
        <div className="card p-4 flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-brand-green/10 border border-brand-green/20 flex items-center justify-center flex-shrink-0">
            <Users size={18} className="text-brand-green"/>
          </div>
          <div>
            <div className="text-2xl font-black text-slate-100">{stats?.total ?? '—'}</div>
            <div className="text-xs text-slate-500 font-semibold">Total</div>
          </div>
        </div>
        <div className="card p-4 flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-yellow-500/10 border border-yellow-500/20 flex items-center justify-center flex-shrink-0">
            <Clock size={18} className="text-yellow-400"/>
          </div>
          <div>
            <div className="text-2xl font-black text-slate-100">{stats?.pending ?? '—'}</div>
            <div className="text-xs text-slate-500 font-semibold">En attente</div>
          </div>
        </div>
        <div className="card p-4 flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center flex-shrink-0">
            <CheckCircle size={18} className="text-blue-400"/>
          </div>
          <div>
            <div className="text-2xl font-black text-slate-100">{stats?.rewarded ?? '—'}</div>
            <div className="text-xs text-slate-500 font-semibold">Convertis</div>
          </div>
        </div>
        <div className="card p-4 flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center flex-shrink-0">
            <TrendingUp size={18} className="text-purple-400"/>
          </div>
          <div>
            <div className="text-2xl font-black text-slate-100">{stats?.conversionRate != null ? `${stats.conversionRate}%` : '—'}</div>
            <div className="text-xs text-slate-500 font-semibold">Conversion</div>
          </div>
        </div>
        <div className="card p-4 flex items-center gap-3 col-span-2 lg:col-span-1">
          <div className="w-10 h-10 rounded-xl bg-brand-green/10 border border-brand-green/20 flex items-center justify-center flex-shrink-0">
            <Gift size={18} className="text-brand-green"/>
          </div>
          <div>
            <div className="text-xl font-black text-slate-100">{stats != null ? formatCFA(stats.totalCredits) : '—'}</div>
            <div className="text-xs text-slate-500 font-semibold">Crédits distribués</div>
          </div>
        </div>
      </div>

      {/* Config */}
      <div className="card p-5">
        <div className="flex items-center gap-2 mb-4">
          <Gift size={16} className="text-brand-green"/>
          <span className="font-black text-slate-100 text-sm">Configuration des récompenses</span>
        </div>
        <div className="flex items-end gap-4 flex-wrap">
          <div className="flex-1 min-w-48">
            <label className="label mb-1.5">Montant de récompense parrain (FCFA)</label>
            <input
              type="number" min="0"
              value={rewardAmount}
              onChange={e => setRewardAmount(e.target.value)}
              className="input w-full" placeholder="500"
            />
          </div>
          <div className="flex items-center gap-3 pb-1">
            <label className="label">Parrainage actif</label>
            <button
              onClick={() => setEnabled(v => !v)}
              className={`w-10 h-5 rounded-full transition-all relative ${enabled ? 'bg-brand-green' : 'bg-navy-600'}`}
            >
              <span className={`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-all ${enabled ? 'left-5' : 'left-0.5'}`}/>
            </button>
            <span className="text-xs font-semibold text-slate-400">{enabled ? 'Activé' : 'Désactivé'}</span>
          </div>
          <button
            onClick={() => {
              const amt = Number(rewardAmount)
              if (isNaN(amt) || amt < 0) { toast.error('Montant invalide'); return }
              configMutation.mutate()
            }}
            disabled={configMutation.isPending}
            className="btn-primary gap-2"
          >
            <Save size={14}/> Sauvegarder
          </button>
        </div>
      </div>

      {/* Onglets */}
      <div className="flex gap-2 items-center overflow-x-auto pb-1">
        {([
          { key: 'stats',   label: 'Statistiques',    icon: BarChart3 },
          { key: 'links',   label: 'Liens & QR codes', icon: Link2 },
          { key: 'history', label: 'Historique',       icon: Clock },
        ] as const).map(({ key, label, icon: Icon }) => (
          <button key={key} onClick={() => setActiveTab(key)}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold transition-all ${activeTab === key ? 'bg-brand-green text-white' : 'bg-navy-800 text-slate-400 border border-navy-600 hover:text-slate-200'}`}>
            <Icon size={14}/>{label}
          </button>
        ))}
        <button onClick={() => { refetch(); if (activeTab === 'links') refetchLinks() }}
          className="ml-auto p-2 text-slate-400 hover:text-white hover:bg-navy-700 rounded-lg transition-colors">
          <RefreshCw size={15} className={isFetching ? 'animate-spin' : ''}/>
        </button>
      </div>

      {/* ─── Onglet Statistiques ─── */}
      {activeTab === 'stats' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          {/* Top Parrains */}
          <div className="card p-5">
            <div className="flex items-center gap-2 mb-4">
              <Trophy size={16} className="text-brand-yellow"/>
              <span className="font-black text-slate-100 text-sm">Top Parrains</span>
            </div>
            {isLoading
              ? <div className="flex justify-center py-8"><div className="w-6 h-6 border-2 border-brand-green border-t-transparent rounded-full animate-spin"/></div>
              : topReferrers.length === 0
                ? <div className="text-center py-8 text-slate-500 text-sm">Aucun parrain avec conversion</div>
                : (
                  <div className="space-y-2">
                    {topReferrers.map((item: any, i: number) => {
                      const rate = item.total > 0 ? Math.round((item.rewarded / item.total) * 100) : 0
                      return (
                        <div key={i} className="flex items-center gap-3 p-3 card-sm">
                          <div className={`w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 text-xs font-black
                            ${i === 0 ? 'bg-yellow-500/20 text-yellow-400' : i === 1 ? 'bg-slate-500/20 text-slate-300' : i === 2 ? 'bg-orange-500/20 text-orange-400' : 'bg-navy-700 text-slate-500'}`}>
                            {i + 1}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="text-sm font-bold text-slate-200 truncate">
                              {[item.user?.firstName, item.user?.name].filter(Boolean).join(' ') || '—'}
                            </div>
                            <div className="text-xs text-slate-500 font-mono">{item.user?.phone || '—'}</div>
                          </div>
                          <div className="text-right flex-shrink-0">
                            <div className="text-sm font-black text-brand-green">{item.rewarded} converti{item.rewarded > 1 ? 's' : ''}</div>
                            <div className="text-xs text-slate-500">{item.total} total · {rate}%</div>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                )
            }
          </div>

          {/* Tendance mensuelle */}
          <div className="card p-5">
            <div className="flex items-center gap-2 mb-4">
              <BarChart3 size={16} className="text-brand-green"/>
              <span className="font-black text-slate-100 text-sm">Tendance mensuelle</span>
            </div>
            {isLoading
              ? <div className="flex justify-center py-8"><div className="w-6 h-6 border-2 border-brand-green border-t-transparent rounded-full animate-spin"/></div>
              : (
                <div className="space-y-2.5">
                  {monthly.map((m: any) => {
                    const [year, month] = m.month.split('-')
                    const label = `${MONTH_LABELS[month] ?? month} ${year}`
                    const createdPct = Math.round((m.created / maxMonthly) * 100)
                    const rewardedPct = m.created > 0 ? Math.round((m.rewarded / m.created) * 100) : 0
                    return (
                      <div key={m.month} className="space-y-1">
                        <div className="flex items-center justify-between text-xs">
                          <span className="text-slate-400 font-semibold w-16">{label}</span>
                          <span className="text-slate-500">{m.created} parr. · <span className="text-brand-green">{m.rewarded} conv.</span> · {rewardedPct}%</span>
                        </div>
                        <div className="flex gap-1 h-2">
                          <div className="flex-1 bg-navy-700 rounded-full overflow-hidden">
                            <div className="h-full bg-slate-500/60 rounded-full transition-all" style={{ width: `${createdPct}%` }}/>
                          </div>
                          <div className="flex-1 bg-navy-700 rounded-full overflow-hidden">
                            <div className="h-full bg-brand-green rounded-full transition-all" style={{ width: `${rewardedPct}%` }}/>
                          </div>
                        </div>
                      </div>
                    )
                  })}
                  <div className="flex items-center gap-4 pt-2 text-[10px] text-slate-500 font-semibold">
                    <span className="flex items-center gap-1.5"><span className="w-3 h-1.5 rounded-full bg-slate-500/60 inline-block"/>Parrainages créés</span>
                    <span className="flex items-center gap-1.5"><span className="w-3 h-1.5 rounded-full bg-brand-green inline-block"/>Conversions</span>
                  </div>
                </div>
              )
            }
          </div>
        </div>
      )}

      {/* ─── Onglet Liens & QR ─── */}
      {activeTab === 'links' && (
        <div className="space-y-4">
          <div className="card p-4 flex flex-wrap gap-3 items-end">
            <div className="flex-1 min-w-[200px]">
              <label className="label mb-1">Recherche parrain / code</label>
              <input className="input w-full text-sm" value={linkSearch}
                onChange={e => setLinkSearch(e.target.value)}
                placeholder="Nom, téléphone, code…"/>
            </div>
            <div className="flex-1 min-w-[200px]">
              <label className="label mb-1">Générer un code (ID utilisateur)</label>
              <div className="flex gap-2">
                <input className="input flex-1 text-sm font-mono" value={generateUserId}
                  onChange={e => setGenerateUserId(e.target.value)}
                  placeholder="UUID utilisateur"/>
                <button
                  onClick={() => {
                    if (!generateUserId.trim()) { toast.error('ID requis'); return }
                    generateMutation.mutate(generateUserId.trim())
                  }}
                  disabled={generateMutation.isPending}
                  className="btn-primary text-xs px-3 whitespace-nowrap">
                  {generateMutation.isPending ? '…' : 'Générer'}
                </button>
              </div>
            </div>
            <button onClick={() => refetchLinks()} className="btn-secondary text-xs px-3 self-end gap-1.5">
              <RefreshCw size={13} className={linksLoading ? 'animate-spin' : ''}/> Actualiser
            </button>
          </div>

          {linksLoading
            ? <div className="flex justify-center py-12"><div className="w-6 h-6 border-2 border-brand-green border-t-transparent rounded-full animate-spin"/></div>
            : filteredLinks.length === 0
              ? <div className="card p-10 text-center text-slate-500 text-sm">Aucun lien de parrainage actif</div>
              : (
                <div className="card p-2">
                  <div className="grid grid-cols-1 divide-y divide-navy-700">
                    {filteredLinks.map((u: any) => {
                      const url = `${REFERRAL_BASE_URL}/${u.referralCode}`
                      const rate = u.totalReferrals > 0 ? Math.round((u.rewardedReferrals / u.totalReferrals) * 100) : 0
                      return (
                        <div key={u.id} className="flex items-center gap-3 px-3 py-3 hover:bg-navy-800/50 transition-colors">
                          <div className="w-8 h-8 rounded-xl bg-brand-green/10 border border-brand-green/20 flex items-center justify-center flex-shrink-0">
                            <span className="text-brand-green font-black text-xs">{(u.firstName || u.name || '?')[0].toUpperCase()}</span>
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="text-sm font-bold text-slate-200">{[u.firstName, u.name].filter(Boolean).join(' ') || '—'}</span>
                              <span className="text-[10px] font-black font-mono text-brand-green bg-brand-green/10 px-1.5 py-0.5 rounded-md">{u.referralCode}</span>
                            </div>
                            <div className="text-xs text-slate-500 font-mono truncate">{url}</div>
                          </div>
                          <div className="hidden lg:flex items-center gap-4 flex-shrink-0 text-center">
                            <div>
                              <div className="text-sm font-black text-slate-200">{u.totalReferrals}</div>
                              <div className="text-[10px] text-slate-500">parrainages</div>
                            </div>
                            <div>
                              <div className="text-sm font-black text-brand-green">{u.rewardedReferrals}</div>
                              <div className="text-[10px] text-slate-500">convertis</div>
                            </div>
                            <div>
                              <div className="text-sm font-black text-purple-400">{rate}%</div>
                              <div className="text-[10px] text-slate-500">taux</div>
                            </div>
                          </div>
                          <button
                            onClick={() => setSelectedLink(u)}
                            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-slate-300 bg-navy-700 hover:bg-navy-600 rounded-lg transition-colors flex-shrink-0">
                            <QrCode size={13}/> QR
                          </button>
                        </div>
                      )
                    })}
                  </div>
                </div>
              )
          }
        </div>
      )}

      {/* ─── Onglet Historique ─── */}
      {activeTab === 'history' && (
        <div className="space-y-4">
          <div className="card p-4 flex flex-wrap gap-3 items-center">
            <Filter size={14} className="text-slate-500"/>
            <span className="text-xs font-bold text-slate-500">Filtrer par statut :</span>
            {[
              { value: '',         label: 'Tous' },
              { value: 'PENDING',  label: 'En attente' },
              { value: 'REWARDED', label: 'Convertis' },
            ].map(opt => (
              <button key={opt.value} onClick={() => setStatusFilter(opt.value)}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${statusFilter === opt.value ? 'bg-brand-green text-white' : 'bg-navy-800 text-slate-400 border border-navy-600 hover:text-slate-200'}`}>
                {opt.label}
                {opt.value === '' && <span className="ml-1.5 text-[10px] opacity-70">({referrals.length})</span>}
                {opt.value === 'PENDING' && <span className="ml-1.5 text-[10px] opacity-70">({stats?.pending ?? 0})</span>}
                {opt.value === 'REWARDED' && <span className="ml-1.5 text-[10px] opacity-70">({stats?.rewarded ?? 0})</span>}
              </button>
            ))}
          </div>
          <div className="card p-5">
            <DataTable
              columns={referralColumns}
              data={filteredReferrals}
              loading={isLoading}
              exportable
              exportFilename="parrainages"
            />
          </div>
        </div>
      )}

      {/* Modal QR Code */}
      <Modal open={!!selectedLink} onClose={() => setSelectedLink(null)} title="Lien & QR Code" size="sm">
        {selectedLink && <LinkQRPanel user={selectedLink} onClose={() => setSelectedLink(null)}/>}
      </Modal>
    </div>
  )
}
