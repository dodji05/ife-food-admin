import React, { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import api from '../../services/api'
import { DataTable } from '../../components/ui/DataTable'
import { Badge } from '../../components/ui/Badge'
import { formatDateTime, formatCFA } from '../../utils/format'
import { Gift, Users, Clock, CheckCircle, TrendingUp, Save } from 'lucide-react'
import toast from 'react-hot-toast'

const unwrap = (r: any) => r?.data?.data ?? r?.data ?? r

export const Referrals: React.FC = () => {
  const qc = useQueryClient()
  const [rewardAmount, setRewardAmount] = useState<string>('')
  const [enabled, setEnabled] = useState(true)
  const [configLoaded, setConfigLoaded] = useState(false)

  const { data: referralData, isLoading } = useQuery({
    queryKey: ['referrals'],
    queryFn: () => api.get('/admin/referrals').then(unwrap),
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

  const stats = referralData?.stats
  const referrals = referralData?.referrals ?? []

  const columns = [
    {
      key: 'referrer', label: 'Parrain',
      render: (r: any) => (
        <div>
          <div className="font-semibold text-slate-200 text-sm">{[r.referrer?.firstName, r.referrer?.name].filter(Boolean).join(' ') || '—'}</div>
          <div className="text-xs text-slate-500 font-mono">{r.referrer?.phone || '—'}</div>
        </div>
      ),
    },
    {
      key: 'referee', label: 'Filleul',
      render: (r: any) => (
        <div>
          <div className="font-semibold text-slate-200 text-sm">{[r.referee?.firstName, r.referee?.name].filter(Boolean).join(' ') || '—'}</div>
          <div className="text-xs text-slate-500 font-mono">{r.referee?.phone || '—'}</div>
        </div>
      ),
    },
    { key: 'status', label: 'Statut', render: (r: any) => <Badge status={r.status}/> },
    {
      key: 'rewardedAt', label: 'Récompensé le',
      render: (r: any) => <span className="text-xs text-slate-400">{r.rewardedAt ? formatDateTime(r.rewardedAt) : '—'}</span>,
    },
    { key: 'createdAt', label: 'Date parrainage', render: (r: any) => <span className="text-xs text-slate-400">{formatDateTime(r.createdAt)}</span> },
  ]

  return (
    <div className="space-y-5">
      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="card p-4 flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-brand-green/10 border border-brand-green/20 flex items-center justify-center flex-shrink-0">
            <Users size={18} className="text-brand-green"/>
          </div>
          <div>
            <div className="text-2xl font-black text-slate-100">{stats?.total ?? '—'}</div>
            <div className="text-xs text-slate-500 font-semibold">Parrainages total</div>
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
            <div className="text-xs text-slate-500 font-semibold">Récompensés</div>
          </div>
        </div>
        <div className="card p-4 flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-brand-green/10 border border-brand-green/20 flex items-center justify-center flex-shrink-0">
            <TrendingUp size={18} className="text-brand-green"/>
          </div>
          <div>
            <div className="text-2xl font-black text-slate-100">{stats != null ? formatCFA(stats.totalCredits) : '—'}</div>
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
              type="number"
              min="0"
              value={rewardAmount}
              onChange={e => setRewardAmount(e.target.value)}
              className="input w-full"
              placeholder="500"
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

      {/* Table */}
      <div className="card p-5">
        <DataTable columns={columns} data={referrals} loading={isLoading}/>
      </div>
    </div>
  )
}
