import React, { useEffect, useState } from 'react'
import { useParams, useSearchParams, Link } from 'react-router-dom'

const API_BASE = import.meta.env.VITE_API_URL
  ? `${import.meta.env.VITE_API_URL}/api/v1`
  : '/api/v1'

const APP_URL: string = import.meta.env.VITE_APP_URL ?? ''

const LEGAL_TYPES: Record<string, { label: string; slug: string }> = {
  about:          { label: 'À propos',                  slug: 'ABOUT' },
  cgu:            { label: 'CGU',                       slug: 'CGU' },
  cgv:            { label: 'CGV',                       slug: 'CGV' },
  privacy:        { label: 'Politique de confidentialité', slug: 'PRIVACY' },
  'driver-charter': { label: 'Charte livreurs',         slug: 'DRIVER_CHARTER' },
  'pro-charter':  { label: 'Charte professionnels',     slug: 'PRO_CHARTER' },
}

const LANGS = ['fr', 'en', 'es', 'de', 'ru', 'ar', 'zh']

interface LegalData {
  title: string
  content: string
  version: string
  updatedAt: string
}

// Module-level cache: slug/lang → data (cleared on page reload)
const legalCache = new Map<string, LegalData>()

export const LegalPage: React.FC = () => {
  const { pageSlug } = useParams<{ pageSlug: string }>()
  const [searchParams, setSearchParams] = useSearchParams()
  const lang = searchParams.get('lang') || 'fr'
  const meta = pageSlug ? LEGAL_TYPES[pageSlug] : undefined

  const [data, setData] = useState<LegalData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)

  useEffect(() => {
    if (!meta) { setLoading(false); return }
    const cacheKey = `${meta.slug}/${lang}`
    const cached = legalCache.get(cacheKey)
    if (cached) { setData(cached); setLoading(false); return }
    setLoading(true)
    setError(false)
    fetch(`${API_BASE}/config/legal/${meta.slug}/${lang}`)
      .then((r) => r.json())
      .then((res) => {
        const d = res?.data ?? res
        const payload = d?.content ? d : null
        if (payload) legalCache.set(cacheKey, payload)
        setData(payload)
      })
      .catch(() => setError(true))
      .finally(() => setLoading(false))
  }, [meta?.slug, lang])

  // Canonical + title dynamiques
  useEffect(() => {
    if (!meta) return
    document.title = `${data?.title || meta.label} — ifè FOOD`
    let canonical = document.querySelector<HTMLLinkElement>('link[rel="canonical"]')
    if (!canonical) {
      canonical = document.createElement('link')
      canonical.rel = 'canonical'
      document.head.appendChild(canonical)
    }
    canonical.href = APP_URL ? `${APP_URL}/legal/${pageSlug}` : window.location.href
    return () => { document.title = 'ifè FOOD Admin' }
  }, [meta, data, pageSlug])

  const setLang = (l: string) => setSearchParams({ lang: l })

  if (!meta) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center space-y-4">
          <p className="text-2xl font-black text-gray-800">Page introuvable</p>
          <Link to="/dashboard" className="text-green-700 hover:underline text-sm font-semibold">
            ← Retour à l'accueil
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 py-4 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3 min-w-0">
            <span className="text-2xl font-black text-green-700 shrink-0">ifè</span>
            <span className="text-gray-300 text-lg shrink-0">/</span>
            <span className="text-gray-700 font-bold text-sm truncate">{meta.label}</span>
          </div>

          {/* Sélecteur de langue */}
          <div className="flex gap-1 shrink-0">
            {LANGS.map((l) => (
              <button
                key={l}
                onClick={() => setLang(l)}
                className={`px-2 py-1 rounded text-xs font-bold transition-all ${
                  lang === l
                    ? 'bg-green-700 text-white'
                    : 'text-gray-500 hover:text-gray-800 hover:bg-gray-100'
                }`}
              >
                {l.toUpperCase()}
              </button>
            ))}
          </div>
        </div>
      </header>

      {/* Navigation inter-pages */}
      <nav className="bg-white border-b border-gray-100">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 flex gap-1 overflow-x-auto py-2 scrollbar-none">
          {Object.entries(LEGAL_TYPES).map(([slug, info]) => (
            <Link
              key={slug}
              to={`/legal/${slug}${lang !== 'fr' ? `?lang=${lang}` : ''}`}
              className={`shrink-0 px-3 py-1.5 rounded-lg text-xs font-bold transition-all whitespace-nowrap ${
                pageSlug === slug
                  ? 'bg-green-700/10 text-green-800 border border-green-300'
                  : 'text-gray-500 hover:text-gray-800 hover:bg-gray-100'
              }`}
            >
              {pageSlug === slug && <span className="mr-1">✓</span>}
              {info.label}
            </Link>
          ))}
        </div>
      </nav>

      {/* Contenu */}
      <main className="max-w-4xl mx-auto px-4 sm:px-6 py-10">
        {loading ? (
          <div className="space-y-4 animate-pulse">
            <div className="h-8 bg-gray-200 rounded-xl w-64"/>
            <div className="h-4 bg-gray-200 rounded w-40"/>
            <div className="space-y-3 pt-4">
              {[...Array(6)].map((_, i) => <div key={i} className="h-4 bg-gray-200 rounded" style={{ width: `${75 + (i % 3) * 10}%` }}/>)}
            </div>
          </div>
        ) : error ? (
          <div className="text-center py-16 space-y-2">
            <p className="text-gray-500 font-semibold">Impossible de charger cette page.</p>
            <button onClick={() => { setLoading(true); setError(false) }} className="text-green-700 text-sm hover:underline">
              Réessayer
            </button>
          </div>
        ) : !data ? (
          <div className="text-center py-16">
            <p className="text-gray-400 font-semibold">Contenu non disponible pour cette langue.</p>
            {lang !== 'fr' && (
              <button onClick={() => setLang('fr')} className="mt-2 text-green-700 text-sm hover:underline">
                Voir en français
              </button>
            )}
          </div>
        ) : (
          <article>
            <header className="mb-8 pb-6 border-b border-gray-200">
              <h1 className="text-3xl font-black text-gray-900">{data.title || meta.label}</h1>
              <div className="flex items-center gap-4 mt-3 text-xs text-gray-400">
                {data.version && <span>Version {data.version}</span>}
                {data.updatedAt && (
                  <span>
                    Mise à jour le{' '}
                    {new Date(data.updatedAt).toLocaleDateString('fr-FR', {
                      day: 'numeric', month: 'long', year: 'numeric',
                    })}
                  </span>
                )}
              </div>
            </header>

            <div
              className="max-w-none"
              dangerouslySetInnerHTML={{ __html: data.content }}
            />
          </article>
        )}
      </main>

      {/* Footer */}
      <footer className="border-t border-gray-200 bg-white mt-16 py-6">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-gray-400">
          <span>© {new Date().getFullYear()} ifè FOOD — Tous droits réservés</span>
          <div className="flex gap-4">
            {Object.entries(LEGAL_TYPES).map(([slug, info]) => (
              <Link key={slug} to={`/legal/${slug}`} className="hover:text-gray-700 transition-colors">
                {info.label}
              </Link>
            ))}
          </div>
        </div>
      </footer>
    </div>
  )
}
