import { create } from 'zustand'
import api from '../services/api'

interface AdminUser {
  id: string
  phone?: string
  email?: string
  name?: string
  firstName?: string
  role: string
  admin?: { level: string }
}

interface AuthStore {
  user: AdminUser | null
  initializing: boolean
  setUser: (user: AdminUser) => void
  logout: () => Promise<void>
  initialize: () => Promise<void>
}

export const useAuthStore = create<AuthStore>()((set) => ({
  user: null,
  initializing: true,

  setUser: (user) => set({ user }),

  logout: async () => {
    try {
      await api.post('/auth/admin/logout')
    } catch {
      // Ignorer les erreurs réseau au logout
    }
    set({ user: null })
  },

  initialize: async () => {
    try {
      const res = (await api.get('/auth/admin/me')) as any
      set({ user: res.data ?? res, initializing: false })
    } catch {
      set({ user: null, initializing: false })
    }
  },
}))
