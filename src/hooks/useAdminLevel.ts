import { useAuthStore } from '../store/auth'

type AdminLevel = 'SUPER_ADMIN' | 'ADMIN' | 'MODERATOR' | 'ANALYST'

const PERMISSIONS: Record<string, AdminLevel[]> = {
  'validate-users':    ['SUPER_ADMIN', 'ADMIN', 'MODERATOR'],
  'suspend-users':     ['SUPER_ADMIN', 'ADMIN', 'MODERATOR'],
  'manage-promo':      ['SUPER_ADMIN', 'ADMIN'],
  'manage-commission': ['SUPER_ADMIN', 'ADMIN'],
  'manage-gateways':   ['SUPER_ADMIN', 'ADMIN'],
  'maintenance':       ['SUPER_ADMIN'],
  'manage-admins':     ['SUPER_ADMIN'],
  'view-analytics':    ['SUPER_ADMIN', 'ADMIN', 'MODERATOR', 'ANALYST'],
}

export function useAdminLevel() {
  const user = useAuthStore((s) => s.user)
  const level = (user?.admin?.level ?? null) as AdminLevel | null

  const can = (action: keyof typeof PERMISSIONS): boolean => {
    if (!level) return false
    return PERMISSIONS[action]?.includes(level) ?? false
  }

  return { level, can }
}
