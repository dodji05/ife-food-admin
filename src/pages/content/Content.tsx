import React, { useState, useEffect } from 'react'
import { useQuery, useMutation } from '@tanstack/react-query'
import api from '../../services/api'
import { Save, Globe } from 'lucide-react'
import toast from 'react-hot-toast'

const LEGAL_TYPES = ['ABOUT','CGU','CGV','PRIVACY','DRIVER_CHARTER','PRO_CHARTER']
const LANGS = ['fr','en','es','de','ru','ar','zh']

export const Content: React.FC = () => {
  const [type, setType] = useState('CGU')
  const [lang, setLang] = useState('fr')
  const [title, setTitle] = useState('')
  const [content, setContent] = useState('')
  const [version, setVersion] = useState('1.0')

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
  }, [legalData, isLoading])

  const saveMutation = useMutation({
    mutationFn: () => api.put(`/admin/legal/${type}/${lang}`, { title, content, version }),
    onSuccess: () => toast.success('Page légale enregistrée !'),
    onError: (e: any) => toast.error(e.message),
  })

  return (
    <div className="space-y-5">
      <div className="card p-5 space-y-4">
        <h3 className="text-base font-black text-slate-100">📄 Pages légales</h3>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="label">Document</label>
            <select value={type} onChange={e => setType(e.target.value)} className="input">
              {LEGAL_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
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
        {isLoading ? <div className="h-40 bg-navy-900 rounded-xl animate-pulse"/> : (
          <div className="space-y-3">
            <div>
              <label className="label">Titre</label>
              <input value={title} onChange={e => setTitle(e.target.value)} className="input" placeholder="Titre de la page…"/>
            </div>
            <div>
              <label className="label">Contenu</label>
              <textarea value={content} onChange={e => setContent(e.target.value)} rows={12} className="input resize-y font-mono text-xs" placeholder="Contenu de la page légale…"/>
            </div>
            <div className="flex items-center gap-4">
              <div className="flex-1">
                <label className="label">Version</label>
                <input value={version} onChange={e => setVersion(e.target.value)} className="input w-32" placeholder="1.0"/>
              </div>
              <button onClick={() => saveMutation.mutate()} disabled={saveMutation.isPending} className="btn-primary mt-5">
                <Save size={14}/> {saveMutation.isPending ? 'Enregistrement…' : 'Enregistrer'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
