import React, { useState } from 'react'
import { Link } from 'react-router-dom'

const API_BASE = import.meta.env.VITE_API_URL
  ? `${import.meta.env.VITE_API_URL}/api/v1`
  : '/api/v1'

export const DeleteAccountPage: React.FC = () => {
  const [phone, setPhone] = useState('')
  const [reason, setReason] = useState('')
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!phone.trim()) return
    setLoading(true)
    setError('')
    try {
      await fetch(`${API_BASE}/users/delete-request`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone: phone.trim(), reason }),
      })
      setSuccess(true)
    } catch {
      setError('Une erreur est survenue. Réessayez ou contactez support@ifefood.bj')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200">
        <div className="max-w-2xl mx-auto px-4 sm:px-6 py-4 flex items-center gap-3">
          <span className="text-2xl font-black text-green-700">ifè</span>
          <span className="text-gray-300 text-lg">/</span>
          <span className="text-gray-700 font-bold text-sm">Suppression de compte</span>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-4 sm:px-6 py-10">
        {success ? (
          <div className="bg-white rounded-2xl border border-gray-200 p-8 text-center space-y-4">
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto">
              <svg className="w-8 h-8 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <h2 className="text-xl font-black text-gray-900">Demande envoyée</h2>
            <p className="text-gray-500 text-sm leading-relaxed">
              Votre demande de suppression de compte a été enregistrée.
              Notre équipe la traitera dans un délai de 30 jours.
              Vous recevrez une confirmation par SMS.
            </p>
          </div>
        ) : (
          <div className="space-y-6">
            {/* En-tête */}
            <div>
              <h1 className="text-2xl font-black text-gray-900">Supprimer votre compte ifè FOOD</h1>
              <p className="mt-2 text-gray-500 text-sm leading-relaxed">
                Vous pouvez supprimer votre compte directement depuis l'application ou en remplissant ce formulaire.
                La suppression est définitive et irréversible.
              </p>
            </div>

            {/* Option 1 — Via l'app */}
            <div className="bg-green-50 border border-green-200 rounded-2xl p-5">
              <h2 className="font-black text-green-800 text-sm mb-3">Option 1 — Via l'application (recommandé)</h2>
              <ol className="space-y-2 text-sm text-green-700">
                <li className="flex gap-2"><span className="font-bold shrink-0">1.</span> Ouvrez l'app ifè FOOD</li>
                <li className="flex gap-2"><span className="font-bold shrink-0">2.</span> Allez dans <strong>Profil</strong></li>
                <li className="flex gap-2"><span className="font-bold shrink-0">3.</span> Faites défiler jusqu'à la section <strong>Danger</strong></li>
                <li className="flex gap-2"><span className="font-bold shrink-0">4.</span> Appuyez sur <strong>Supprimer mon compte</strong> et confirmez</li>
              </ol>
            </div>

            {/* Option 2 — Formulaire */}
            <div className="bg-white border border-gray-200 rounded-2xl p-5">
              <h2 className="font-black text-gray-800 text-sm mb-4">Option 2 — Formulaire de demande</h2>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-gray-600 mb-1">
                    Numéro de téléphone associé au compte *
                  </label>
                  <input
                    type="tel"
                    value={phone}
                    onChange={e => setPhone(e.target.value)}
                    placeholder="+229 01 XX XX XX XX"
                    required
                    className="w-full border border-gray-300 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-600 mb-1">
                    Raison (optionnel)
                  </label>
                  <textarea
                    value={reason}
                    onChange={e => setReason(e.target.value)}
                    placeholder="Pourquoi souhaitez-vous supprimer votre compte ?"
                    rows={3}
                    className="w-full border border-gray-300 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent resize-none"
                  />
                </div>

                {error && (
                  <p className="text-red-600 text-xs font-semibold">{error}</p>
                )}

                <button
                  type="submit"
                  disabled={loading || !phone.trim()}
                  className="w-full bg-red-600 hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed text-white font-black text-sm py-3 rounded-xl transition-colors"
                >
                  {loading ? 'Envoi en cours...' : 'Soumettre la demande'}
                </button>
              </form>
            </div>

            {/* Données supprimées */}
            <div className="bg-white border border-gray-200 rounded-2xl p-5">
              <h2 className="font-black text-gray-800 text-sm mb-3">Données supprimées</h2>
              <ul className="space-y-1.5 text-sm text-gray-500">
                {['Profil et informations personnelles', 'Historique des commandes', 'Adresses enregistrées', 'Avis et évaluations', 'Données de paiement'].map(item => (
                  <li key={item} className="flex items-center gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-red-400 shrink-0" />
                    {item}
                  </li>
                ))}
              </ul>
            </div>

            <p className="text-xs text-gray-400 text-center">
              Des questions ? Contactez-nous à{' '}
              <a href="mailto:support@ifefood.bj" className="text-green-700 hover:underline font-semibold">
                support@ifefood.bj
              </a>
            </p>
          </div>
        )}
      </main>

      <footer className="border-t border-gray-200 bg-white mt-10 py-5">
        <div className="max-w-2xl mx-auto px-4 sm:px-6 flex flex-col sm:flex-row items-center justify-between gap-2 text-xs text-gray-400">
          <span>© {new Date().getFullYear()} ifè FOOD — Tous droits réservés</span>
          <div className="flex gap-4">
            <Link to="/legal/privacy" className="hover:text-gray-700">Confidentialité</Link>
            <Link to="/legal/cgu" className="hover:text-gray-700">CGU</Link>
          </div>
        </div>
      </footer>
    </div>
  )
}
