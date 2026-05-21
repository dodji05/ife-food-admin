import React, { useState } from 'react'
import { NavLink } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { useAuthStore } from '../../store/auth'
import api from '../../services/api'
import {
  LayoutDashboard, ShoppingCart, Users, Briefcase, Truck,
  Package, CreditCard, FileText, Settings, BarChart3,
  Tag, Gift, ChevronLeft, ChevronRight, LogOut, X
} from 'lucide-react'

const navItems = [
  { to: '/dashboard',     icon: LayoutDashboard, label: 'Tableau de bord' },
  { to: '/orders',        icon: ShoppingCart,    label: 'Commandes',       badge: 'orders' },
  { to: '/analytics',     icon: BarChart3,       label: 'Analytique' },
  { to: '/users',         icon: Users,           label: 'Clients' },
  { to: '/professionals', icon: Briefcase,       label: 'Professionnels',  badge: 'professionals' },
  { to: '/drivers',       icon: Truck,           label: 'Livreurs',        badge: 'drivers' },
  { to: '/catalogue',     icon: Package,         label: 'Catalogue' },
  { to: '/promo-codes',   icon: Tag,             label: 'Codes promo' },
  { to: '/referrals',    icon: Gift,            label: 'Parrainage' },
  { to: '/payments',      icon: CreditCard,      label: 'Paiements' },
  { to: '/content',       icon: FileText,        label: 'Contenu' },
  { to: '/settings',      icon: Settings,        label: 'Configuration' },
]

interface SidebarProps {
  mobileOpen?: boolean
  onClose?: () => void
}

export const Sidebar: React.FC<SidebarProps> = ({ mobileOpen = false, onClose }) => {
  // `collapsed` ne s'applique QU'en desktop (lg+). En drawer mobile, le sidebar
  // est toujours rendu en pleine largeur (les classes lg:hidden ci-dessous le garantissent).
  const [collapsed, setCollapsed] = useState(false)
  const { user, logout } = useAuthStore()

  const { data: pendingCounts } = useQuery({
    queryKey: ['pending-counts'],
    queryFn: async () => {
      const [pros, drivers, orders] = await Promise.allSettled([
        api.get('/admin/pending/professionals').then((r: any) => (Array.isArray(r) ? r : r.data ?? []).length),
        api.get('/admin/pending/drivers').then((r: any) => (Array.isArray(r) ? r : r.data ?? []).length),
        api.get('/admin/orders?status=PAID').then((r: any) => (Array.isArray(r) ? r : r.data ?? []).length),
      ])
      return {
        professionals: pros.status === 'fulfilled' ? (pros.value ?? 0) : 0,
        drivers: drivers.status === 'fulfilled' ? (drivers.value ?? 0) : 0,
        orders: orders.status === 'fulfilled' ? (orders.value ?? 0) : 0,
      }
    },
    refetchInterval: 60000,
  })

  // Classe utilitaire : cache l'élément uniquement en desktop quand collapsed=true.
  // Garantit que tout reste visible dans le drawer mobile.
  const hideOnCollapsed = collapsed ? 'lg:hidden' : ''

  return (
    <>
      {/* Backdrop mobile */}
      {mobileOpen && (
        <div
          className="lg:hidden fixed inset-0 z-40 bg-black/60 backdrop-blur-sm"
          onClick={onClose}
          aria-label="Fermer le menu"
        />
      )}

      <aside
        className={`flex flex-col bg-navy-900 border-r border-navy-700 transition-transform duration-300
          fixed inset-y-0 left-0 z-50 w-64
          ${mobileOpen ? 'translate-x-0' : '-translate-x-full'}
          lg:static lg:translate-x-0 lg:transition-all ${collapsed ? 'lg:w-16' : 'lg:w-64'}
          min-h-screen`}
      >
        {/* Logo */}
        <div className="flex items-center gap-3 p-4 border-b border-navy-700">
          <div className="w-9 h-9 bg-brand-green rounded-xl flex items-center justify-center flex-shrink-0">
            <span className="text-white font-black text-sm">ifè</span>
          </div>
          <div className={hideOnCollapsed}>
            <div className="text-white font-black text-base leading-none">ifè FOOD</div>
            <div className="text-brand-yellow text-[10px] font-bold tracking-widest">ADMIN</div>
          </div>
          {/* Bouton collapse — desktop uniquement */}
          <button
            onClick={() => setCollapsed(!collapsed)}
            className="hidden lg:block ml-auto p-1 text-slate-400 hover:text-white transition-colors"
            aria-label={collapsed ? 'Déplier' : 'Replier'}
          >
            {collapsed ? <ChevronRight size={16}/> : <ChevronLeft size={16}/>}
          </button>
          {/* Bouton fermer — mobile uniquement */}
          <button
            onClick={onClose}
            className="lg:hidden ml-auto p-1 text-slate-400 hover:text-white transition-colors"
            aria-label="Fermer le menu"
          >
            <X size={18}/>
          </button>
        </div>

        {/* Nav */}
        <nav className="flex-1 p-2 space-y-0.5 overflow-y-auto">
          {navItems.map(({ to, icon: Icon, label, badge }) => {
            const count = badge ? (pendingCounts as any)?.[badge] ?? 0 : 0
            return (
              <NavLink key={to} to={to} className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-semibold transition-all duration-150
                 ${isActive ? 'bg-brand-green/15 text-brand-green border border-brand-green/30' : 'text-slate-400 hover:bg-navy-800 hover:text-slate-200'}`
              }>
                <div className="relative flex-shrink-0">
                  <Icon size={18}/>
                  {count > 0 && (
                    <span className="absolute -top-1.5 -right-1.5 w-4 h-4 bg-red-500 text-white text-[9px] font-black rounded-full flex items-center justify-center">
                      {count > 9 ? '9+' : count}
                    </span>
                  )}
                </div>
                <span className={`flex-1 ${hideOnCollapsed}`}>{label}</span>
                {count > 0 && (
                  <span className={`text-[10px] font-black bg-red-500/20 text-red-400 px-1.5 py-0.5 rounded-full ${hideOnCollapsed}`}>{count}</span>
                )}
              </NavLink>
            )
          })}
        </nav>

        {/* User */}
        <div className="border-t border-navy-700 p-3">
          <div className={`flex items-center gap-3 mb-2 px-1 ${hideOnCollapsed}`}>
            <div className="w-8 h-8 rounded-full bg-brand-green/20 border border-brand-green/30 flex items-center justify-center flex-shrink-0">
              <span className="text-brand-green font-black text-xs">{user?.firstName?.[0] || 'A'}</span>
            </div>
            <div className="min-w-0">
              <div className="text-sm font-bold text-slate-200 truncate">{[user?.firstName, user?.name].filter(Boolean).join(' ') || 'Admin'}</div>
              <div className="text-[10px] text-slate-500 font-semibold uppercase tracking-wider">{user?.admin?.level || 'SUPER_ADMIN'}</div>
            </div>
          </div>
          <button onClick={logout} className="flex items-center gap-2 w-full px-3 py-2 text-red-400 hover:bg-red-500/10 rounded-xl text-sm font-semibold transition-colors">
            <LogOut size={16}/>
            <span className={hideOnCollapsed}>Déconnexion</span>
          </button>
        </div>
      </aside>
    </>
  )
}
