// ─────────────────────────────────────────────────────────────────────────────
// useConfirm — dialog de confirmation cohérent à l'échelle de l'admin.
// Remplace les `window.confirm` natifs (UI inconsistante) par un Modal stylé
// du design system, accessible (focus trap, Escape, role=dialog) et Promise-based.
//
// Usage :
//   const confirm = useConfirm()
//   const ok = await confirm({
//     title: 'Suspendre ce compte ?',
//     message: 'L\'utilisateur ne pourra plus se connecter.',
//     variant: 'danger',
//     confirmLabel: 'Suspendre',
//   })
//   if (!ok) return
//   mutation.mutate(...)
// ─────────────────────────────────────────────────────────────────────────────
import React, { createContext, useCallback, useContext, useRef, useState } from 'react'
import { AlertTriangle, AlertCircle, Info } from 'lucide-react'
import { Modal } from '../components/ui/Modal'

export type ConfirmVariant = 'danger' | 'warning' | 'info'

export interface ConfirmOptions {
  title: string
  message?: React.ReactNode
  /** Couleur/icône du dialog. Défaut: 'danger'. */
  variant?: ConfirmVariant
  /** Libellé du bouton de confirmation. Défaut: 'Confirmer'. */
  confirmLabel?: string
  /** Libellé du bouton d'annulation. Défaut: 'Annuler'. */
  cancelLabel?: string
}

type ConfirmFn = (opts: ConfirmOptions) => Promise<boolean>

const ConfirmContext = createContext<ConfirmFn | null>(null)

const VARIANTS = {
  danger: {
    Icon: AlertTriangle,
    iconWrap: 'text-red-400 bg-red-500/10 border-red-500/30',
    button:   'bg-red-500/15 hover:bg-red-500/25 text-red-300 border-red-500/40',
  },
  warning: {
    Icon: AlertCircle,
    iconWrap: 'text-yellow-400 bg-yellow-500/10 border-yellow-500/30',
    button:   'bg-yellow-500/15 hover:bg-yellow-500/25 text-yellow-300 border-yellow-500/40',
  },
  info: {
    Icon: Info,
    iconWrap: 'text-blue-400 bg-blue-500/10 border-blue-500/30',
    button:   'bg-brand-green/15 hover:bg-brand-green/25 text-brand-green border-brand-green/40',
  },
} as const

interface State extends ConfirmOptions { open: boolean }

export const ConfirmProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [state, setState] = useState<State | null>(null)
  const resolveRef = useRef<((v: boolean) => void) | null>(null)

  const confirm = useCallback<ConfirmFn>((opts) => {
    return new Promise<boolean>((resolve) => {
      // Si un dialog est déjà ouvert (rare), on le résout en "false" pour ne pas
      // perdre la promesse précédente, puis on affiche le nouveau.
      resolveRef.current?.(false)
      resolveRef.current = resolve
      setState({ open: true, ...opts })
    })
  }, [])

  const close = (result: boolean) => {
    resolveRef.current?.(result)
    resolveRef.current = null
    setState(null)
  }

  const variant = state?.variant ?? 'danger'
  const v = VARIANTS[variant]

  return (
    <ConfirmContext.Provider value={confirm}>
      {children}
      {state && (
        <Modal
          open={state.open}
          onClose={() => close(false)}
          title={state.title}
          size="sm"
        >
          <div className="space-y-5">
            <div className="flex items-start gap-3">
              <div className={`p-2 rounded-xl border flex-shrink-0 ${v.iconWrap}`}>
                <v.Icon size={20}/>
              </div>
              {state.message && (
                <div className="text-sm text-slate-300 leading-relaxed pt-1 whitespace-pre-wrap">
                  {state.message}
                </div>
              )}
            </div>
            <div className="flex gap-3 justify-end">
              <button
                type="button"
                onClick={() => close(false)}
                className="btn-secondary px-4"
              >
                {state.cancelLabel ?? 'Annuler'}
              </button>
              <button
                type="button"
                onClick={() => close(true)}
                className={`font-semibold px-4 py-2.5 rounded-xl border text-sm transition-colors ${v.button}`}
                autoFocus
              >
                {state.confirmLabel ?? 'Confirmer'}
              </button>
            </div>
          </div>
        </Modal>
      )}
    </ConfirmContext.Provider>
  )
}

export const useConfirm = (): ConfirmFn => {
  const ctx = useContext(ConfirmContext)
  if (!ctx) throw new Error('useConfirm() doit être utilisé à l\'intérieur de <ConfirmProvider>')
  return ctx
}
