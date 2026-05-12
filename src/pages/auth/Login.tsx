import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuthStore } from '../../store/auth'
import api from '../../services/api'
import { Eye, EyeOff, Lock, Phone, Shield } from 'lucide-react'
import toast from 'react-hot-toast'

export const Login: React.FC = () => {
  const [step, setStep] = useState<'phone' | 'otp' | 'pin'>('phone')
  const [phone, setPhone] = useState('')
  const [otp, setOtp] = useState('')
  const [pin, setPin] = useState('')
  const [sessionId, setSessionId] = useState('')
  const [showPin, setShowPin] = useState(false)
  const [loading, setLoading] = useState(false)
  const { setAuth } = useAuthStore()
  const nav = useNavigate()

  const sendOtp = async () => {
    setLoading(true)
    try {
      const res: any = await api.post('/auth/otp/send', { phone, countryCode: 'BJ' })
      setSessionId(res.data.sessionId)
      setStep('otp')
      toast.success('Code OTP envoyé !')
    } catch (e: any) { toast.error(e.message) }
    finally { setLoading(false) }
  }

  const verifyOtp = async () => {
    setLoading(true)
    try {
      const res: any = await api.post('/auth/otp/verify', { phone, code: otp, sessionId })
      if (res.data.user.role !== 'ADMIN') {
        toast.error('Accès refusé — Compte administrateur requis')
        return
      }
      setAuth(res.data.accessToken, res.data.user)
      toast.success('Connecté !')
      nav('/dashboard')
    } catch (e: any) { toast.error(e.message) }
    finally { setLoading(false) }
  }

  return (
    <div className="min-h-screen bg-navy-950 flex items-center justify-center p-4">
      <div className="w-full max-w-sm space-y-6">
        {/* Brand */}
        <div className="text-center space-y-2">
          <div className="w-16 h-16 bg-brand-green rounded-2xl flex items-center justify-center mx-auto shadow-lg shadow-brand-green/30">
            <span className="text-white font-black text-xl">ifè</span>
          </div>
          <h1 className="text-2xl font-black text-slate-100">ifè FOOD Admin</h1>
          <p className="text-slate-400 text-sm font-semibold">Tableau de bord administrateur</p>
        </div>

        <div className="card p-6 space-y-4">
          {step === 'phone' && <>
            <div>
              <label className="label">Numéro de téléphone admin</label>
              <div className="relative">
                <Phone size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500"/>
                <input value={phone} onChange={e => setPhone(e.target.value)} className="input pl-9" placeholder="+22991000000"/>
              </div>
            </div>
            <button onClick={sendOtp} disabled={loading || !phone} className="btn-primary w-full justify-center py-3">
              {loading ? <span className="animate-spin">◌</span> : 'Envoyer le code OTP'}
            </button>
            {import.meta.env.DEV && <p className="text-xs text-center text-slate-500 font-medium">Dev: Le code s'affiche dans les logs back-end</p>}
          </>}

          {step === 'otp' && <>
            <div>
              <label className="label">Code OTP (6 chiffres)</label>
              <input value={otp} onChange={e => setOtp(e.target.value)} maxLength={6} className="input text-center text-xl font-black tracking-widest" placeholder="000000"/>
            </div>
            <button onClick={verifyOtp} disabled={loading || otp.length !== 6} className="btn-primary w-full justify-center py-3">
              {loading ? '…' : 'Vérifier le code'}
            </button>
            <button onClick={() => setStep('phone')} className="text-sm text-slate-400 hover:text-slate-200 w-full text-center font-semibold transition-colors">
              ← Retour
            </button>
          </>}
        </div>

        <div className="flex items-center justify-center gap-2 text-xs text-slate-600 font-semibold">
          <Shield size={12}/> Connexion sécurisée · Ets SWK FAKEYE
        </div>
      </div>
    </div>
  )
}
