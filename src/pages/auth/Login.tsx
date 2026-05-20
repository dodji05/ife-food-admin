import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuthStore } from '../../store/auth'
import api from '../../services/api'
import { Eye, EyeOff, Mail, Lock, Shield, ArrowLeft } from 'lucide-react'
import toast from 'react-hot-toast'

type Step = 'login' | 'reset-request' | 'reset-confirm'

export const Login: React.FC = () => {
  const [step, setStep] = useState<Step>('login')

  // Login
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)

  // Reset
  const [resetEmail, setResetEmail] = useState('')
  const [resetSessionId, setResetSessionId] = useState('')
  const [resetCode, setResetCode] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [showNewPassword, setShowNewPassword] = useState(false)

  const [loading, setLoading] = useState(false)
  const { setUser } = useAuthStore()
  const nav = useNavigate()

  const handleLogin = async () => {
    if (!email || !password) return
    setLoading(true)
    try {
      const res: any = await api.post('/auth/admin/login', { email, password })
      const userData = res.data ?? res
      if (userData?.role !== 'ADMIN') {
        toast.error('Accès refusé — compte administrateur requis')
        return
      }
      setUser(userData)
      nav('/dashboard')
    } catch (e: any) {
      toast.error(e.message)
    } finally {
      setLoading(false)
    }
  }

  const handleResetRequest = async () => {
    if (!resetEmail) return
    setLoading(true)
    try {
      const res: any = await api.post('/auth/admin/request-reset', { email: resetEmail })
      setResetSessionId(res.sessionId ?? '')
      setStep('reset-confirm')
      toast.success('Code OTP envoyé sur votre téléphone')
    } catch (e: any) {
      toast.error(e.message)
    } finally {
      setLoading(false)
    }
  }

  const handleResetConfirm = async () => {
    if (!resetCode || !newPassword) return
    setLoading(true)
    try {
      await api.post('/auth/admin/confirm-reset', {
        email: resetEmail,
        sessionId: resetSessionId,
        code: resetCode,
        newPassword,
      })
      toast.success('Mot de passe réinitialisé ! Connectez-vous.')
      setStep('login')
    } catch (e: any) {
      toast.error(e.message)
    } finally {
      setLoading(false)
    }
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
          <p className="text-slate-400 text-sm font-semibold">
            {step === 'login' ? 'Tableau de bord administrateur' : 'Réinitialisation du mot de passe'}
          </p>
        </div>

        <div className="card p-6 space-y-4">

          {/* ── Step: Login ── */}
          {step === 'login' && <>
            <div>
              <label className="label">Adresse e-mail</label>
              <div className="relative">
                <Mail size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500"/>
                <input
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && handleLogin()}
                  type="email"
                  className="input pl-9"
                  placeholder="admin@ifefood.com"
                  autoComplete="email"
                />
              </div>
            </div>

            <div>
              <label className="label">Mot de passe</label>
              <div className="relative">
                <Lock size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500"/>
                <input
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && handleLogin()}
                  type={showPassword ? 'text' : 'password'}
                  className="input pl-9 pr-10"
                  placeholder="••••••••"
                  autoComplete="current-password"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(v => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300"
                >
                  {showPassword ? <EyeOff size={16}/> : <Eye size={16}/>}
                </button>
              </div>
            </div>

            <button
              onClick={handleLogin}
              disabled={loading || !email || !password}
              className="btn-primary w-full justify-center py-3"
            >
              {loading
                ? <span className="animate-spin inline-block w-4 h-4 border-2 border-white border-t-transparent rounded-full"/>
                : 'Se connecter'
              }
            </button>

            <button
              onClick={() => { setResetEmail(email); setStep('reset-request') }}
              className="text-sm text-slate-400 hover:text-slate-200 w-full text-center font-semibold transition-colors"
            >
              Mot de passe oublié ?
            </button>
          </>}

          {/* ── Step: Reset request ── */}
          {step === 'reset-request' && <>
            <button onClick={() => setStep('login')} className="flex items-center gap-1 text-sm text-slate-400 hover:text-slate-200 font-semibold">
              <ArrowLeft size={14}/> Retour
            </button>
            <div>
              <label className="label">Adresse e-mail admin</label>
              <div className="relative">
                <Mail size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500"/>
                <input
                  value={resetEmail}
                  onChange={e => setResetEmail(e.target.value)}
                  type="email"
                  className="input pl-9"
                  placeholder="admin@ifefood.com"
                />
              </div>
              <p className="text-xs text-slate-500 mt-1.5 font-medium">
                Un code OTP sera envoyé au numéro associé à ce compte.
              </p>
            </div>
            <button
              onClick={handleResetRequest}
              disabled={loading || !resetEmail}
              className="btn-primary w-full justify-center py-3"
            >
              {loading ? '…' : 'Envoyer le code OTP'}
            </button>
          </>}

          {/* ── Step: Reset confirm ── */}
          {step === 'reset-confirm' && <>
            <button onClick={() => setStep('reset-request')} className="flex items-center gap-1 text-sm text-slate-400 hover:text-slate-200 font-semibold">
              <ArrowLeft size={14}/> Retour
            </button>
            <div>
              <label className="label">Code OTP (6 chiffres)</label>
              <input
                value={resetCode}
                onChange={e => setResetCode(e.target.value)}
                maxLength={6}
                className="input text-center text-xl font-black tracking-widest"
                placeholder="000000"
              />
            </div>
            <div>
              <label className="label">Nouveau mot de passe</label>
              <div className="relative">
                <Lock size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500"/>
                <input
                  value={newPassword}
                  onChange={e => setNewPassword(e.target.value)}
                  type={showNewPassword ? 'text' : 'password'}
                  className="input pl-9 pr-10"
                  placeholder="Min. 8 caractères"
                />
                <button
                  type="button"
                  onClick={() => setShowNewPassword(v => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300"
                >
                  {showNewPassword ? <EyeOff size={16}/> : <Eye size={16}/>}
                </button>
              </div>
            </div>
            <button
              onClick={handleResetConfirm}
              disabled={loading || resetCode.length !== 6 || newPassword.length < 8}
              className="btn-primary w-full justify-center py-3"
            >
              {loading ? '…' : 'Réinitialiser le mot de passe'}
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
