import axios from 'axios'
import { useAuthStore } from '../store/auth'

const baseURL = import.meta.env.VITE_API_URL
  ? `${import.meta.env.VITE_API_URL}/api/v1`
  : '/api/v1'

// Validation en production
if (!import.meta.env.VITE_API_URL && import.meta.env.PROD) {
  console.error('[API] VITE_API_URL must be defined in production')
}

const api = axios.create({ baseURL, timeout: 15000, headers: { 'Content-Type': 'application/json' } })

const ERROR_MESSAGES: Record<number, string> = {
  400: 'Requête invalide',
  401: 'Session expirée, veuillez vous reconnecter',
  403: 'Accès refusé',
  404: 'Ressource introuvable',
  422: 'Données invalides',
  429: 'Trop de requêtes, veuillez patienter',
  500: 'Erreur serveur, réessayez plus tard',
  503: 'Service temporairement indisponible',
}

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('admin_token')
  if (token) config.headers.Authorization = `Bearer ${token}`
  return config
})

api.interceptors.response.use(
  (res) => res.data,
  (err) => {
    const status: number = err.response?.status
    // FIX: Utiliser logout() du store + replace() au lieu de href direct
    // Évite le bug du flag _redirecting jamais réinitialisé
    if (status === 401 && window.location.pathname !== '/login') {
      useAuthStore.getState().logout()
      window.location.replace('/login')
    }
    const message = ERROR_MESSAGES[status] ?? err.response?.data?.message ?? 'Une erreur est survenue'
    return Promise.reject(new Error(message))
  }
)

export default api
