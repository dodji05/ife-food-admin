import React from 'react'
import { Sun, Moon, Sparkles } from 'lucide-react'
import { useTheme } from '../../hooks/useTheme'

type Override = 'auto' | 'light' | 'dark'

const OPTIONS: { value: Override; label: string; sub?: string; icon: React.ReactNode }[] = [
  { value: 'light', label: 'Clair',  icon: <Sun size={15}/> },
  { value: 'auto',  label: 'Auto',   sub: '19h–6h', icon: <Sparkles size={15}/> },
  { value: 'dark',  label: 'Sombre', icon: <Moon size={15}/> },
]

export const ThemeToggleCompact: React.FC = () => {
  const { override, setOverride } = useTheme()

  return (
    <div className="flex items-center gap-1 bg-panel border border-edge rounded-xl p-1">
      {OPTIONS.map((opt) => (
        <button
          key={opt.value}
          onClick={() => setOverride(opt.value)}
          title={opt.label + (opt.sub ? ` (${opt.sub})` : '')}
          className={`
            flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-bold
            transition-all duration-150
            ${override === opt.value
              ? 'bg-brand-green text-white'
              : 'text-ink2 hover:text-ink'}
          `}
        >
          {opt.icon}
          <span className="hidden sm:inline">{opt.label}</span>
        </button>
      ))}
    </div>
  )
}

export const ThemeToggleFull: React.FC = () => {
  const { override, isDark, isNight, label, setOverride } = useTheme()

  return (
    <div className="card p-5 space-y-4">
      <div className="flex items-center gap-3">
        <div className="w-9 h-9 rounded-xl bg-brand-green/10 border border-brand-green/20 flex items-center justify-center">
          {isDark
            ? <Moon size={18} className="text-blue-400"/>
            : <Sun  size={18} className="text-brand-green"/>}
        </div>
        <div>
          <h3 className="text-sm font-bold text-ink">Apparence</h3>
          <p className="text-xs text-ink2 font-semibold">{label}</p>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-2">
        {OPTIONS.map((opt) => (
          <button
            key={opt.value}
            onClick={() => setOverride(opt.value)}
            className={`
              flex flex-col items-center gap-1.5 py-3 rounded-xl border text-xs font-bold
              transition-all duration-150
              ${override === opt.value
                ? 'bg-brand-green/10 border-brand-green text-brand-green'
                : 'bg-panel border-edge text-ink2 hover:text-ink hover:border-edge'}
            `}
          >
            {opt.icon}
            <span>{opt.label}</span>
            {opt.sub && (
              <span className={`text-[10px] font-semibold ${override === opt.value ? 'text-brand-green/70' : 'text-ink3'}`}>
                {opt.sub}
              </span>
            )}
          </button>
        ))}
      </div>

      {override === 'auto' && (
        <div className="flex items-start gap-2 p-3 bg-panel rounded-xl border border-edge2">
          <Sparkles size={14} className="text-brand-yellow mt-0.5 flex-shrink-0"/>
          <p className="text-xs text-ink2 font-medium leading-relaxed">
            Le thème bascule automatiquement en{' '}
            <span className="text-ink2 font-bold">sombre à 19h00</span> et revient en{' '}
            <span className="text-ink2 font-bold">clair à 6h00</span>.{' '}
            Actuellement : {isNight ? 'nuit 🌙' : 'jour ☀️'}.
          </p>
        </div>
      )}
    </div>
  )
}
