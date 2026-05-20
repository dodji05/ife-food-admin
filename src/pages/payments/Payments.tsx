import React, { useState, useEffect } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import api from '../../services/api'
import { StatCard } from '../../components/ui/StatCard'
import { formatCFA } from '../../utils/format'
import { CreditCard, DollarSign, TrendingUp, Settings, Save } from 'lucide-react'
import toast from 'react-hot-toast'

export const Payments: React.FC = () => {
  const [commType, setCommType] = useState<'PERCENTAGE' | 'FIXED_AMOUNT'>('PERCENTAGE')
  const [commValue, setCommValue] = useState('15')
  const [gateways, setGateways] = useState({ STRIPE: true, PAYPAL: true, KKIAPAY: true, FEDAPAY: true })
  const qc = useQueryClient()

  const { data: payStats, isLoading: statsLoading } = useQuery({
    queryKey: ['payment-stats'],
    queryFn: () => api.get('/admin/payments/stats').then((r: any) => r.data).catch(() => null),
  })

  // FIX: Charger la configuration commission et gateways depuis l'API
  // Évite d'écraser la config prod avec des valeurs hardcodées
  // FIX: Utilise le vrai endpoint GET /admin/config/commission (ajouté au backend)
  const { data: commConfig } = useQuery({
    queryKey: ['commission-config'],
    queryFn: () => api.get('/admin/config/commission').then((r: any) => r.data).catch(() => null),
    staleTime: Infinity,
    refetchOnWindowFocus: false,
  })

  const { data: gatewayConfig } = useQuery({
    queryKey: ['gateway-config'],
    queryFn: () => api.get('/admin/config/platform').then((r: any) => r.data).catch(() => null),
    staleTime: Infinity,
    refetchOnWindowFocus: false,
  })

  useEffect(() => {
    if (commConfig) {
      setCommType(commConfig.type ?? 'PERCENTAGE')
      setCommValue(String(commConfig.value ?? '15'))
    }
  }, [commConfig])

  useEffect(() => {
    if (gatewayConfig?.paymentGateways) {
      setGateways(g => ({ ...g, ...gatewayConfig.paymentGateways }))
    }
  }, [gatewayConfig])

  const saveCommission = async () => {
    const value = Number(commValue)
    if (!commValue.trim() || isNaN(value) || value < 0) { toast.error('Valeur de commission invalide'); return }
    if (commType === 'PERCENTAGE' && value > 100) { toast.error('Le taux ne peut pas dépasser 100%'); return }
    try {
      await api.put('/admin/config/commission', { type: commType, value })
      toast.success('Commission mise à jour !')
    } catch (e: any) { toast.error(e.message) }
  }

  const saveGateways = async () => {
    if (!Object.values(gateways).some(Boolean)) {
      toast.error('Au moins une passerelle de paiement doit rester active')
      return
    }
    try {
      await api.put('/admin/config/payment-gateways', gateways)
      toast.success('Passerelles mises à jour !')
    } catch (e: any) { toast.error(e.message) }
  }

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
        <StatCard title="CA total (mois)" value={payStats ? formatCFA(payStats.monthlyRevenue ?? 0) : '—'} icon={TrendingUp} color="brand-green" loading={statsLoading}/>
        <StatCard title="Commissions (mois)" value={payStats ? formatCFA(payStats.monthlyCommissions ?? 0) : '—'} icon={DollarSign} color="yellow" loading={statsLoading}/>
        <StatCard title="Virements en attente" value={payStats?.pendingPayouts ?? '—'} icon={CreditCard} color="blue" loading={statsLoading}/>
        <StatCard title="Transactions totales" value={payStats?.totalTransactions ?? '—'} icon={Settings} color="purple" loading={statsLoading}/>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        {/* Commission config */}
        <div className="card p-5 space-y-4">
          <h3 className="text-base font-black text-slate-100">⚙️ Commission plateforme</h3>
          <div className="flex gap-2">
            {(['PERCENTAGE', 'FIXED_AMOUNT'] as const).map(t => (
              <button key={t} onClick={() => setCommType(t)}
                className={`flex-1 py-2 rounded-xl text-xs font-bold transition-all ${commType === t ? 'bg-brand-green text-white' : 'bg-navy-700 text-slate-400 border border-navy-600'}`}>
                {t === 'PERCENTAGE' ? '% Pourcentage' : '💰 Montant fixe'}
              </button>
            ))}
          </div>
          <div>
            <label className="label">{commType === 'PERCENTAGE' ? 'Taux (%)' : 'Montant (F CFA)'}</label>
            <input value={commValue} onChange={e => setCommValue(e.target.value)} type="number" className="input" placeholder="15"/>
            <p className="text-xs text-slate-500 mt-1.5 font-medium">
              {commType === 'PERCENTAGE' ? `Sur chaque commande, ${commValue}% sera prélevé sur le sous-total` : `${commValue} F sera ajouté à chaque prix de produit`}
            </p>
          </div>
          <button onClick={saveCommission} className="btn-primary w-full justify-center"><Save size={14}/> Enregistrer</button>
        </div>

        {/* Payment gateways */}
        <div className="card p-5 space-y-4">
          <h3 className="text-base font-black text-slate-100">💳 Passerelles de paiement</h3>
          <div className="space-y-3">
            {Object.entries(gateways).map(([name, enabled]) => (
              <div key={name} className="flex items-center gap-3 p-3 bg-navy-900 rounded-xl border border-navy-700">
                <div className="text-lg">{name === 'STRIPE' ? '💳' : name === 'PAYPAL' ? '🅿️' : '📱'}</div>
                <div className="flex-1">
                  <div className="text-sm font-bold text-slate-200">{name}</div>
                  <div className="text-xs text-slate-500">{name === 'STRIPE' ? 'International' : name === 'PAYPAL' ? 'Mondial' : 'Afrique francophone'}</div>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input type="checkbox" checked={enabled} onChange={e => setGateways(g => ({ ...g, [name]: e.target.checked }))} className="sr-only peer"/>
                  <div className="w-10 h-5 bg-navy-700 peer-focus:ring-2 peer-focus:ring-brand-green/30 rounded-full peer peer-checked:after:translate-x-5 peer-checked:bg-brand-green after:content-[''] after:absolute after:top-0.5 after:left-[2px] after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all"/>
                </label>
              </div>
            ))}
          </div>
          <button onClick={saveGateways} className="btn-primary w-full justify-center"><Save size={14}/> Enregistrer</button>
        </div>
      </div>
    </div>
  )
}
