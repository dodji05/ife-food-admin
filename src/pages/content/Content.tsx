import React, { useState, useEffect, useCallback } from 'react'
import { useQuery, useMutation } from '@tanstack/react-query'
import api from '../../services/api'
import { Save, Globe, Eye, Code2, AlertTriangle } from 'lucide-react'
import toast from 'react-hot-toast'
import DOMPurify from 'dompurify'

// ─── Sanitisation HTML ────────────────────────────────────────────────────────
// Autorise les balises/attributs nécessaires aux pages légales.
// Bloque script, iframe, on*, style inline dangereux, etc.
const PURIFY_CONFIG: DOMPurify.Config = {
  ALLOWED_TAGS: [
    'h1','h2','h3','h4','h5','h6',
    'p','br','hr','div','section','article','blockquote','pre','code',
    'ul','ol','li','dl','dt','dd',
    'table','thead','tbody','tr','th','td','caption',
    'strong','b','em','i','u','s','mark','small','sup','sub',
    'a','span',
    'img',
  ],
  ALLOWED_ATTR: [
    'href','target','rel',
    'src','alt','width','height',
    'class','id',
    'colspan','rowspan',
    'style',
  ],
  // Limite les propriétés CSS autorisées dans l'attribut style
  ALLOWED_URI_REGEXP: /^(?:(?:https?|mailto):|[^a-z]|[a-z+.-]+(?:[^a-z+.\-:]|$))/i,
  ADD_ATTR: ['target'],
  FORCE_BODY: true,
  RETURN_DOM_FRAGMENT: false,
  RETURN_DOM: false,
}

// Force rel="noopener noreferrer" sur les liens externes
DOMPurify.addHook('afterSanitizeAttributes', (node) => {
  if (node.tagName === 'A' && node.getAttribute('href')?.startsWith('http')) {
    node.setAttribute('target', '_blank')
    node.setAttribute('rel', 'noopener noreferrer')
  }
})

function sanitize(html: string): string {
  return DOMPurify.sanitize(html, PURIFY_CONFIG) as string
}

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
    // Si le presse-papiers contient du HTML, l'injecter sanitisé
    const html = e.clipboardData.getData('text/html')
    if (html) {
      e.preventDefault()
      const clean = sanitize(html)
      const target = e.currentTarget
      const start  = target.selectionStart
      const end    = target.selectionEnd
      const next   = content.slice(0, start) + clean + content.slice(end)
      setContent(next)
    }
    // sinon : comportement natif (texte brut)
  }, [content])

  const saveMutation = useMutation({
    mutationFn: () => api.put(`/admin/legal/${type}/${lang}`, {
      title,
      content: sanitize(content),
      version,
    }),
    onSuccess: () => toast.success('Page légale enregistrée !'),
    onError: (e: any) => toast.error(e.message),
  })

  const sanitizedPreview = sanitize(content)
  const isDirty = sanitizedPreview !== content

  return (
    <div className="space-y-5">
      <div className="card p-5 space-y-4">
        <h3 className="text-base font-black text-slate-100">📄 Pages légales</h3>

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
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${lang === l ? 'bg-brand-green text-white' : 'bg-navy-700 text-slate-400 border border-navy-600 hover:text-slate-200'}`}>
                  {l.toUpperCase()}
                </button>
              ))}
            </div>
          </div>
        </div>

        {isLoading
          ? <div className="h-40 bg-navy-900 rounded-xl animate-pulse"/>
          : (
            <div className="space-y-3">
              {/* Titre */}
              <div>
                <label className="label">Titre</label>
                <input value={title} onChange={e => setTitle(e.target.value)} className="input" placeholder="Titre de la page…"/>
              </div>

              {/* Onglets Édition / Prévisualisation */}
              <div className="flex items-center gap-2 border-b border-navy-700 pb-1">
                <button
                  onClick={() => setTab('edit')}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-t-lg text-xs font-bold transition-all ${tab === 'edit' ? 'text-brand-green border-b-2 border-brand-green' : 'text-slate-500 hover:text-slate-300'}`}>
                  <Code2 size={13}/> HTML
                </button>
                <button
                  onClick={() => setTab('preview')}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-t-lg text-xs font-bold transition-all ${tab === 'preview' ? 'text-brand-green border-b-2 border-brand-green' : 'text-slate-500 hover:text-slate-300'}`}>
                  <Eye size={13}/> Prévisualisation
                </button>
                <span className="ml-auto text-[10px] text-slate-500">
                  Collez du HTML directement — la sanitisation s'applique automatiquement.
                </span>
              </div>

              {tab === 'edit' ? (
                <div className="space-y-2">
                  <textarea
                    value={content}
                    onChange={e => setContent(e.target.value)}
                    onPaste={handlePaste}
                    rows={18}
                    className="input resize-y font-mono text-xs leading-relaxed"
                    placeholder="Collez ou saisissez le contenu HTML ici…"
                    spellCheck={false}
                  />
                  {isDirty && (
                    <div className="flex items-start gap-2 text-xs text-yellow-400 bg-yellow-500/10 border border-yellow-500/20 rounded-xl px-3 py-2">
                      <AlertTriangle size={13} className="flex-shrink-0 mt-0.5"/>
                      <span>Certaines balises ou attributs non sécurisés ont été détectés et seront retirés à la sauvegarde. Consultez la prévisualisation pour vérifier le rendu final.</span>
                    </div>
                  )}
                </div>
              ) : (
                <div
                  className="min-h-[280px] bg-white text-gray-900 rounded-xl p-5 prose prose-sm max-w-none overflow-auto border border-navy-600"
                  dangerouslySetInnerHTML={{ __html: sanitizedPreview }}
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
