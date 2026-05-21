import React, { useState, useEffect } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Save, Bell, Clock, Shield } from 'lucide-react'
import api from '../../services/api'
import toast from 'react-hot-toast'
import { useConfirm } from '../../hooks/useConfirm'

export const Settings: React.FC = () => {
  const confirm = useConfirm()
  const [otpChannel, setOtpChannel] = useState('SMS')
  const [cancelDelay, setCancelDelay] = useState('5')
  const [missionDelay, setMissionDelay] = useState('30')
  const [maintenanceMode, setMaintenanceMode] = useState(false)
  const [saving, setSaving] = useState(false)

  const { data: config } = useQuery({
    queryKey: ['platform-config'],
    queryFn: () => api.get('/admin/config/platform').then((r: any) => r.data),
  })

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
        message: 'L\'accès à la plateforme sera suspendu pour tous les clients, livreurs et professionnels. Seul l\'admin restera connecté. À utiliser uniquement pour les opérations critiques.',
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
      await api.put('/admin/config/platform', {
        otpChannel,
        cancelDelay: Number(cancelDelay),
        missionDelay: Number(missionDelay),
        maintenanceMode,
      })
      toast.success('Configuration enregistrée !')
    } catch (e: any) {
      toast.error(e.message)
    } finally {
      setSaving(false)
    }
  }

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
      <button onClick={save} disabled={saving} className="btn-primary"><Save size={14}/> {saving ? 'Enregistrement…' : 'Enregistrer la configuration'}</button>
    </div>
  )
}
