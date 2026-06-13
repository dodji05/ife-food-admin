import React, { useState, useEffect, useCallback } from 'react'
import { useQuery, useMutation } from '@tanstack/react-query'
import api from '../../services/api'
import { Save, Globe, Eye, Code2 } from 'lucide-react'
import toast from 'react-hot-toast'

// ─── Constantes ───────────────────────────────────────────────────────────────
const LEGAL_TYPES: Record<string, string> = {
  ABOUT:          'À propos',
  CGU:            'CGU',
  CGV:            'CGV',
  PRIVACY:        'Politique de confidentialité',
  DRIVER_CHARTER: 'Charte livreurs',
  PRO_CHARTER:    'Charte professionnels',
}
const LANGS = ['fr','en','es','de','ru','ar','zh']

// ─── Composant principal ──────────────────────────────────────────────────────
export const Content: React.FC = () => {
  const [type, setType]       = useState('CGU')
  const [lang, setLang]       = useState('fr')
  const [title, setTitle]     = useState('')
  const [content, setContent] = useState('')
  const [version, setVersion] = useState('1.0')
  const [tab, setTab]         = useState<'edit' | 'preview'>('edit')

  const { data: legalData, isLoading } = useQuery({
    queryKey: ['legal', type, lang],
    queryFn: () => api.get(`/admin/legal/${type}/${lang}`).then((r: any) => r ?? null).catch(() => null),
  })

  useEffect(() => {
    if (legalData) {
      setTitle(legalData.title ?? '')
      setContent(legalData.content ?? '')
      setVersion(legalData.version ?? '1.0')
    } else if (!isLoading) {
      setTitle('')
      setContent('')
      setVersion('1.0')
    }
    setTab('edit')
  }, [legalData, isLoading])

  const handlePaste = useCallback((e: React.ClipboardEvent<HTMLTextAreaElement>) => {
    const html = e.clipboardData.getData('text/html')
    if (html) {
      e.preventDefault()
      const target = e.currentTarget
      const start  = target.selectionStart
      const end    = target.selectionEnd
      setContent(content.slice(0, start) + html + content.slice(end))
    }
  }, [content])

  const saveMutation = useMutation({
    mutationFn: () => api.put(`/admin/legal/${type}/${lang}`, { title, content, version }),
    onSuccess: () => toast.success('Page légale enregistrée !'),
    onError: (e: any) => toast.error(e.message),
  })

  return (
    <div className="space-y-5">
      <div className="card p-5 space-y-4">
        <h3 className="text-base font-black text-ink">📄 Pages légales</h3>

        {/* Filtres */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="label">Document</label>
            <select value={type} onChange={e => setType(e.target.value)} className="input">
              {Object.entries(LEGAL_TYPES).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
            </select>
          </div>
          <div>
            <label className="label flex items-center gap-1"><Globe size={12}/> Langue</label>
            <div className="flex gap-1 flex-wrap">
              {LANGS.map(l => (
                <button key={l} onClick={() => setLang(l)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${lang === l ? 'bg-brand-green text-white' : 'bg-lift text-ink2 border border-edge hover:text-ink'}`}>
                  {l.toUpperCase()}
                </button>
              ))}
            </div>
          </div>
        </div>

        {isLoading
          ? <div className="h-40 bg-panel rounded-xl animate-pulse"/>
          : (
            <div className="space-y-3">
              {/* Titre */}
              <div>
                <label className="label">Titre</label>
                <input value={title} onChange={e => setTitle(e.target.value)} className="input" placeholder="Titre de la page…"/>
              </div>

              {/* Onglets Édition / Prévisualisation */}
              <div className="flex items-center gap-2 border-b border-edge2 pb-1">
                <button
                  onClick={() => setTab('edit')}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-t-lg text-xs font-bold transition-all ${tab === 'edit' ? 'text-brand-green border-b-2 border-brand-green' : 'text-ink3 hover:text-ink2'}`}>
                  <Code2 size={13}/> HTML
                </button>
                <button
                  onClick={() => setTab('preview')}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-t-lg text-xs font-bold transition-all ${tab === 'preview' ? 'text-brand-green border-b-2 border-brand-green' : 'text-ink3 hover:text-ink2'}`}>
                  <Eye size={13}/> Prévisualisation
                </button>
                <span className="ml-auto text-[10px] text-ink3">
                  HTML/CSS conservé tel quel — la prévisualisation reflète le rendu final.
                </span>
              </div>

              {tab === 'edit' ? (
                <textarea
                  value={content}
                  onChange={e => setContent(e.target.value)}
                  onPaste={handlePaste}
                  rows={18}
                  className="input resize-y font-mono text-xs leading-relaxed"
                  placeholder="Collez ou saisissez le contenu HTML ici…"
                  spellCheck={false}
                />
              ) : (
                <iframe
                  srcDoc={`<!DOCTYPE html><html><head><meta charset="utf-8"><style>body{font-family:system-ui,sans-serif;font-size:14px;line-height:1.6;padding:20px;margin:0;color:#111;}</style></head><body>${content}</body></html>`}
                  className="w-full rounded-xl border border-edge"
                  style={{ minHeight: 280, height: 480 }}
                  sandbox="allow-same-origin"
                  title="Prévisualisation"
                />
              )}

              {/* Version + Sauvegarder */}
              <div className="flex items-center gap-4 pt-1">
                <div>
                  <label className="label">Version</label>
                  <input value={version} onChange={e => setVersion(e.target.value)} className="input w-28" placeholder="1.0"/>
                </div>
                <button
                  onClick={() => saveMutation.mutate()}
                  disabled={saveMutation.isPending}
                  className="btn-primary mt-5">
                  <Save size={14}/> {saveMutation.isPending ? 'Enregistrement…' : 'Enregistrer'}
                </button>
              </div>
            </div>
          )
        }
      </div>
    </div>
  )
}
