// ─────────────────────────────────────────────────────────────────────────────
// usePasswordPrompt — demande le mot de passe admin avant une action critique
// (suppression définitive de compte). Distinct de useConfirm (pas de saisie).
//
// Usage :
//   const promptPassword = usePasswordPrompt()
//   const password = await promptPassword({
//     title: 'Confirmer la suppression',
//     message: 'Entrez votre mot de passe pour supprimer définitivement ce compte.',
//   })
//   if (!password) return // annulé
//   mutation.mutate({ password })
// ─────────────────────────────────────────────────────────────────────────────
import React, { createContext, useCallback, useContext, useRef, useState } from 'react'
import { Lock } from 'lucide-react'
import { Modal } from '../components/ui/Modal'

export interface PasswordPromptOptions {
  title: string
  message?: React.ReactNode
  confirmLabel?: string
  cancelLabel?: string
}

type PasswordPromptFn = (opts: PasswordPromptOptions) => Promise<string | null>

const PasswordPromptContext = createContext<PasswordPromptFn | null>(null)

interface State extends PasswordPromptOptions { open: boolean }

export const PasswordPromptProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [state, setState] = useState<State | null>(null)
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const resolveRef = useRef<((v: string | null) => void) | null>(null)

  const promptPassword = useCallback<PasswordPromptFn>((opts) => {
    return new Promise<string | null>((resolve) => {
      resolveRef.current?.(null)
      resolveRef.current = resolve
      setPassword('')
      setError('')
      setState({ open: true, ...opts })
    })
  }, [])

  const close = (result: string | null) => {
    resolveRef.current?.(result)
    resolveRef.current = null
    setState(null)
    setPassword('')
    setError('')
  }

  const submit = () => {
    if (!password.trim()) { setError('Mot de passe requis'); return }
    close(password)
  }

  return (
    <PasswordPromptContext.Provider value={promptPassword}>
      {children}
      {state && (
        <Modal open={state.open} onClose={() => close(null)} title={state.title} size="sm">
          <div className="space-y-5">
            <div className="flex items-start gap-3">
              <div className="p-2 rounded-xl border flex-shrink-0 text-red-400 bg-red-500/10 border-red-500/30">
                <Lock size={20}/>
              </div>
              {state.message && (
                <div className="text-sm text-ink2 leading-relaxed pt-1 whitespace-pre-wrap">
                  {state.message}
                </div>
              )}
            </div>
            <div>
              <input
                type="password"
                autoFocus
                value={password}
                onChange={e => { setPassword(e.target.value); setError('') }}
                onKeyDown={e => { if (e.key === 'Enter') submit() }}
                placeholder="Votre mot de passe"
                className="input w-full"
              />
              {error && <div className="text-xs text-red-400 font-semibold mt-1.5">{error}</div>}
            </div>
            <div className="flex gap-3 justify-end">
              <button type="button" onClick={() => close(null)} className="btn-secondary px-4">
                {state.cancelLabel ?? 'Annuler'}
              </button>
              <button
                type="button"
                onClick={submit}
                className="font-semibold px-4 py-2.5 rounded-xl border text-sm transition-colors bg-red-500/15 hover:bg-red-500/25 text-red-300 border-red-500/40"
              >
                {state.confirmLabel ?? 'Confirmer'}
              </button>
            </div>
          </div>
        </Modal>
      )}
    </PasswordPromptContext.Provider>
  )
}

export const usePasswordPrompt = (): PasswordPromptFn => {
  const ctx = useContext(PasswordPromptContext)
  if (!ctx) throw new Error('usePasswordPrompt() doit être utilisé à l\'intérieur de <PasswordPromptProvider>')
  return ctx
}
