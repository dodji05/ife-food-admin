import React, { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import api from '../../services/api'
import { DataTable } from '../../components/ui/DataTable'
import { Badge } from '../../components/ui/Badge'
import { Modal } from '../../components/ui/Modal'
import { formatDateTime, formatCFA } from '../../utils/format'
import { useFiltersStore } from '../../store/filters'
import { useConfirm } from '../../hooks/useConfirm'
import { UserX, UserCheck, Trash2, ExternalLink, Wallet, TrendingUp, TrendingDown, Gift } from 'lucide-react'
import toast from 'react-hot-toast'

const TX_LABELS: Record<string, string> = {
  REFERRAL_REWARD: 'Récompense parrainage',
  ADMIN_CREDIT: 'Crédit admin',
  ADMIN_DEBIT: 'Débit admin',
}

export const Users: React.FC = () => {
  const qc = useQueryClient()
  const confirm = useConfirm()
  const { country } = useFiltersStore()
  const [selected, setSelected] = useState<any>(null)
  const [userTab, setUserTab] = useState<'info' | 'wallet'>('info')
  const [adjustAmount, setAdjustAmount] = useState('')
  const [adjustType, setAdjustType] = useState<'ADMIN_CREDIT' | 'ADMIN_DEBIT'>('ADMIN_CREDIT')
  const [adjustNote, setAdjustNote] = useState('')

  const { data, isLoading } = useQuery({
    queryKey: ['admin-users', country],
    queryFn: () => {
      const params = new URLSearchParams({ role: 'CLIENT' })
      if (country) params.set('country', country)
      return api.get(`/admin/users?${params}`).then((r: any) => r?.data?.data ?? r?.data ?? [])
    },
  })

  const { data: walletData } = useQuery({
    queryKey: ['user-wallet', selected?.id],
    queryFn: () => api.get(`/admin/users/${selected.id}/wallet`).then((r: any) => r?.data?.data ?? r?.data ?? r),
    enabled: !!selected?.id && userTab === 'wallet',
  })

  const adjustMutation = useMutation({
    mutationFn: () => api.post(`/admin/users/${selected.id}/wallet/adjust`, {
      amount: Number(adjustAmount), type: adjustType, description: adjustNote || undefined,
    }),
    onSuccess: () => {
      toast.success(adjustType === 'ADMIN_CREDIT' ? 'Crédit appliqué' : 'Débit appliqué')
      setAdjustAmount(''); setAdjustNote('')
      qc.invalidateQueries({ queryKey: ['user-wallet', selected?.id] })
    },
    onError: (e: any) => toast.error(e.message),
  })

  const statusMutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: string }) => api.patch(`/admin/users/${id}/status`, { status }),
    onSuccess: () => { toast.success('Statut mis à jour'); qc.invalidateQueries({ queryKey: ['admin-users'] }); setSelected(null) },
    onError: (e: any) => toast.error(e.message),
  })

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.delete(`/admin/users/${id}`),
    onSuccess: () => { toast.success('Compte supprimé'); qc.invalidateQueries({ queryKey: ['admin-users'] }); setSelected(null) },
    onError: (e: any) => toast.error(e.message),
  })

  const columns = [
    { key: 'name', label: 'Nom',
      sortable: true,
      sortValue: (r: any) => `${r.firstName ?? ''} ${r.name ?? ''}`.trim().toLowerCase(),
      exportValue: (r: any) => `${r.firstName ?? ''} ${r.name ?? ''}`.trim(),
      render: (r: any) => (
      <div className="flex items-center gap-2">
        <div className="w-7 h-7 rounded-full bg-brand-green/20 border border-brand-green/30 flex items-center justify-center flex-shrink-0">
          <span className="text-brand-green font-black text-[10px]">{(r.firstName || r.name || 'C')[0].toUpperCase()}</span>
        </div>
        <span className="font-semibold text-slate-200">{r.firstName} {r.name}</span>
      </div>
    )},
    { key: 'phone', label: 'Téléphone',
      sortable: true,
      exportValue: (r: any) => r.phone,
      render: (r: any) => <span className="text-sm font-mono text-slate-300">{r.phone}</span> },
    { key: 'countryCode', label: 'Pays',
      sortable: true, hideOnMobile: true,
      exportValue: (r: any) => `${r.countryCode ?? ''} ${r.currency ?? ''}`.trim(),
      render: (r: any) => <span className="text-sm text-slate-400">{r.countryCode} · {r.currency}</span> },
    { key: 'status', label: 'Statut',
      sortable: true,
      exportValue: (r: any) => r.status,
      render: (r: any) => <Badge status={r.status}/> },
    { key: 'createdAt', label: "Inscription",
      sortable: true, hideOnMobile: true,
      sortValue: (r: any) => r.createdAt ? new Date(r.createdAt).getTime() : 0,
      exportValue: (r: any) => r.createdAt,
      render: (r: any) => <span className="text-xs text-slate-400">{formatDateTime(r.createdAt)}</span> },
    { key: 'actions', label: '', width: '80px', render: (r: any) => (
      <div className="flex gap-1">
        <button onClick={(e) => { e.stopPropagation(); setSelected(r) }} className="p-1.5 text-slate-400 hover:text-white hover:bg-navy-700 rounded-lg">
          <ExternalLink size={14}/>
        </button>
        {r.status === 'ACTIVE'
          ? <button onClick={async (e) => {
              e.stopPropagation()
              const ok = await confirm({
                title: 'Suspendre ce compte ?',
                message: `${[r.firstName, r.name].filter(Boolean).join(' ') || r.phone} ne pourra plus se connecter tant que le compte sera suspendu.`,
                variant: 'warning',
                confirmLabel: 'Suspendre',
              })
              if (ok) statusMutation.mutate({ id: r.id, status: 'SUSPENDED' })
            }}
              className="p-1.5 text-yellow-400 hover:bg-yellow-500/10 rounded-lg"><UserX size={14}/></button>
          : <button onClick={(e) => { e.stopPropagation(); statusMutation.mutate({ id: r.id, status: 'ACTIVE' }) }}
              className="p-1.5 text-green-400 hover:bg-green-500/10 rounded-lg"><UserCheck size={14}/></button>
        }
      </div>
    )},
  ]

  return (
    <div className="space-y-4">
      <div className="card p-5">
        <DataTable
          columns={columns}
          data={data || []}
          loading={isLoading}
          onRowClick={setSelected}
          exportable
          exportFilename="clients"
        />
      </div>

      <Modal open={!!selected} onClose={() => { setSelected(null); setUserTab('info') }} title="Détail client" size="lg">
        {selected && (
          <div className="space-y-4">
            {/* Header */}
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 rounded-2xl bg-brand-green/15 border border-brand-green/30 flex items-center justify-center flex-shrink-0">
                <span className="text-brand-green font-black text-xl">{(selected.firstName || selected.name || 'C')[0].toUpperCase()}</span>
              </div>
              <div>
                <div className="text-lg font-black text-slate-100">{selected.firstName} {selected.name}</div>
                <div className="text-sm text-slate-400 font-mono">{selected.phone}</div>
                {selected.email && <div className="text-xs text-slate-500">{selected.email}</div>}
              </div>
              <div className="ml-auto"><Badge status={selected.status}/></div>
            </div>

            {/* Onglets */}
            <div className="flex gap-1 border-b border-navy-700">
              {([
                { key: 'info', label: 'Informations' },
                { key: 'wallet', label: 'Wallet' },
              ] as const).map(({ key, label }) => (
                <button key={key} onClick={() => setUserTab(key)}
                  className={`px-4 py-2 text-sm font-bold border-b-2 -mb-px transition-all ${userTab === key ? 'border-brand-green text-brand-green' : 'border-transparent text-slate-400 hover:text-slate-200'}`}>
                  {label}
                </button>
              ))}
            </div>

            {/* Onglet Informations */}
            {userTab === 'info' && (
              <div className="space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <div className="card-sm p-3">
                    <div className="text-xs text-slate-500 font-bold mb-1">Pays / Devise</div>
                    <div className="font-semibold text-slate-200">{selected.countryCode} · {selected.currency}</div>
                  </div>
                  <div className="card-sm p-3">
                    <div className="text-xs text-slate-500 font-bold mb-1">Inscription</div>
                    <div className="text-sm font-semibold text-slate-300">{formatDateTime(selected.createdAt)}</div>
                  </div>
                </div>
                <div className="card-sm p-3">
                  <div className="text-xs text-slate-500 font-bold mb-1">ID compte</div>
                  <div className="text-xs font-mono text-slate-400 break-all">{selected.id}</div>
                </div>
                <div className="flex gap-3 pt-1">
                  {selected.status === 'ACTIVE'
                    ? <button onClick={async () => {
                        const ok = await confirm({
                          title: 'Suspendre ce compte ?',
                          message: 'L\'utilisateur ne pourra plus se connecter tant que le compte sera suspendu. Vous pourrez le réactiver à tout moment.',
                          variant: 'warning',
                          confirmLabel: 'Suspendre',
                        })
                        if (ok) statusMutation.mutate({ id: selected.id, status: 'SUSPENDED' })
                      }}
                        disabled={statusMutation.isPending} className="btn-secondary flex-1 justify-center text-yellow-400 border-yellow-500/30 hover:bg-yellow-500/10">
                        <UserX size={15}/> Suspendre
                      </button>
                    : <button onClick={() => statusMutation.mutate({ id: selected.id, status: 'ACTIVE' })}
                        disabled={statusMutation.isPending} className="btn-secondary flex-1 justify-center text-green-400 border-green-500/30 hover:bg-green-500/10">
                        <UserCheck size={15}/> Réactiver
                      </button>
                  }
                  <button onClick={async () => {
                    const ok = await confirm({
                      title: 'Supprimer définitivement ce compte ?',
                      message: `Le compte de ${[selected.firstName, selected.name].filter(Boolean).join(' ') || selected.phone} sera effacé. Cette action est irréversible.`,
                      variant: 'danger',
                      confirmLabel: 'Supprimer',
                    })
                    if (ok) deleteMutation.mutate(selected.id)
                  }} disabled={deleteMutation.isPending} className="btn-danger justify-center px-4">
                    <Trash2 size={15}/>
                  </button>
                </div>
              </div>
            )}

            {/* Onglet Wallet */}
            {userTab === 'wallet' && (
              <div className="space-y-4">
                {/* Solde */}
                <div className="card-sm p-4 flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-brand-green/10 border border-brand-green/20 flex items-center justify-center flex-shrink-0">
                    <Wallet size={18} className="text-brand-green"/>
                  </div>
                  <div>
                    <div className="text-xs text-slate-500 font-bold mb-0.5">Solde actuel</div>
                    <div className="text-2xl font-black text-slate-100">{formatCFA(walletData?.balance ?? 0)}</div>
                  </div>
                </div>

                {/* Ajustement manuel */}
                <div className="card-sm p-4 space-y-3">
                  <div className="text-xs text-slate-500 font-bold">Ajustement manuel</div>
                  <div className="flex gap-2">
                    <button onClick={() => setAdjustType('ADMIN_CREDIT')}
                      className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl text-sm font-bold border transition-all ${adjustType === 'ADMIN_CREDIT' ? 'bg-green-500/15 border-green-500/40 text-green-400' : 'border-navy-600 text-slate-500 hover:text-slate-300'}`}>
                      <TrendingUp size={14}/> Crédit
                    </button>
                    <button onClick={() => setAdjustType('ADMIN_DEBIT')}
                      className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl text-sm font-bold border transition-all ${adjustType === 'ADMIN_DEBIT' ? 'bg-red-500/15 border-red-500/40 text-red-400' : 'border-navy-600 text-slate-500 hover:text-slate-300'}`}>
                      <TrendingDown size={14}/> Débit
                    </button>
                  </div>
                  <input type="number" min="1" value={adjustAmount} onChange={e => setAdjustAmount(e.target.value)}
                    className="input w-full" placeholder="Montant en FCFA"/>
                  <input type="text" value={adjustNote} onChange={e => setAdjustNote(e.target.value)}
                    className="input w-full" placeholder="Raison (optionnel)"/>
                  <button
                    onClick={() => {
                      const amt = Number(adjustAmount)
                      if (!adjustAmount.trim() || isNaN(amt) || amt <= 0) { toast.error('Montant invalide'); return }
                      adjustMutation.mutate()
                    }}
                    disabled={adjustMutation.isPending}
                    className={adjustType === 'ADMIN_CREDIT' ? 'btn-primary w-full justify-center' : 'btn-danger w-full justify-center'}>
                    {adjustType === 'ADMIN_CREDIT' ? 'Appliquer le crédit' : 'Appliquer le débit'}
                  </button>
                </div>

                {/* Historique */}
                <div className="space-y-2">
                  <div className="text-xs text-slate-500 font-bold">Historique des transactions</div>
                  {!walletData || walletData.transactions?.length === 0
                    ? <div className="text-center py-6 text-slate-500 text-sm">Aucune transaction</div>
                    : (
                      <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
                        {walletData.transactions?.map((tx: any) => (
                          <div key={tx.id} className="card-sm p-2.5 flex items-center justify-between gap-3">
                            <div className="flex items-center gap-2 min-w-0">
                              {tx.type === 'REFERRAL_REWARD'
                                ? <Gift size={13} className="text-brand-green flex-shrink-0"/>
                                : tx.amount > 0
                                  ? <TrendingUp size={13} className="text-green-400 flex-shrink-0"/>
                                  : <TrendingDown size={13} className="text-red-400 flex-shrink-0"/>
                              }
                              <div className="min-w-0">
                                <div className="text-xs font-semibold text-slate-300 truncate">{TX_LABELS[tx.type] ?? tx.type}</div>
                                {tx.description && <div className="text-[10px] text-slate-500 truncate">{tx.description}</div>}
                              </div>
                            </div>
                            <div className="flex items-center gap-2 flex-shrink-0">
                              <span className={`text-sm font-black ${tx.amount > 0 ? 'text-green-400' : 'text-red-400'}`}>
                                {tx.amount > 0 ? '+' : ''}{formatCFA(tx.amount)}
                              </span>
                              <span className="text-[10px] text-slate-500">{formatDateTime(tx.createdAt)}</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    )
                  }
                </div>
              </div>
            )}
          </div>
        )}
      </Modal>
    </div>
  )
}
