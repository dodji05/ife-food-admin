import { create } from 'zustand'

interface AdminUser { id: string; phone: string; name?: string; firstName?: string; role: string; admin?: { level: string } }
interface AuthStore { token: string | null; user: AdminUser | null; setAuth: (token: string, user: AdminUser) => void; logout: () => void }

function parseStoredUser(): AdminUser | null {
  try { return JSON.parse(localStorage.getItem('admin_user') || 'null') } catch { return null }
}

// Note: vérification de l'expiration côté client uniquement pour l'UX
// La sécurité réelle est assurée par le backend (AdminGuard)
function isTokenExpired(token: string | null): boolean {
  if (!token) return true
  try {
    const payload = JSON.parse(atob(token.split('.')[1]))
    return payload.exp * 1000 < Date.now()
  } catch { return true }
}

// FIX: Encapsuler l'initialisation dans une fonction pour éviter
// les side-effects destructifs au niveau module (problèmes SSR/tests)
function getInitialAuthState(): { token: string | null; user: AdminUser | null } {
  const storedToken = localStorage.getItem('admin_token')
  const tokenValid = !isTokenExpired(storedToken)
  if (!tokenValid) {
    localStorage.removeItem('admin_token')
    localStorage.removeItem('admin_user')
    return { token: null, user: null }
  }
  return { token: storedToken, user: parseStoredUser() }
}

const initialState = getInitialAuthState()

export const useAuthStore = create<AuthStore>()((set) => ({
  token: initialState.token,
  user: initialState.user,
  setAuth: (token, user) => {
    localStorage.setItem('admin_token', token)
    localStorage.setItem('admin_user', JSON.stringify(user))
    set({ token, user })
  },
  logout: () => {
    localStorage.removeItem('admin_token')
    localStorage.removeItem('admin_user')
    set({ token: null, user: null })
  },
}))
