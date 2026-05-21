import React from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { Bell, Menu } from 'lucide-react'
import api from '../../services/api'
import { GlobalFilters } from '../ui/GlobalFilters'

const pageTitles: Record<string, string> = {
  '/dashboard': 'Tableau de bord',
  '/orders': 'Gestion des commandes',
  '/analytics': 'Analytique',
  '/users': 'Clients',
  '/professionals': 'Professionnels',
  '/drivers': 'Livreurs',
  '/catalogue': 'Catalogue',
  '/payments': 'Paiements & Finances',
  '/content': 'Contenu & Légal',
  '/settings': 'Configuration',
}

interface HeaderProps {
  onMenuClick?: () => void
}

export const Header: React.FC<HeaderProps> = ({ onMenuClick }) => {
  const { pathname } = useLocation()
  const navigate = useNavigate()
  const title = pageTitles[pathname] || 'ifè FOOD Admin'
  const now = new Date()

  const { data: unread = 0 } = useQuery({
    queryKey: ['notifications-unread'],
    queryFn: () => api.get('/admin/notifications/unread-count').then((r: any) => r.data?.count ?? 0).catch(() => 0),
    refetchInterval: 60000,
  })

  return (
    <header className="bg-navy-900 border-b border-navy-700 px-4 sm:px-6 py-3 sm:py-4">
      <div className="flex items-center gap-3 sm:gap-4 flex-wrap">
        {/* Hamburger — mobile uniquement */}
        <button
          onClick={onMenuClick}
          className="lg:hidden order-1 p-1.5 -ml-1 text-slate-400 hover:text-white hover:bg-navy-700 rounded-lg transition-colors"
          aria-label="Ouvrir le menu"
        >
          <Menu size={20}/>
        </button>

        {/* Bloc titre */}
        <div className="flex-1 min-w-0 order-2">
          <h1 className="text-base sm:text-lg font-black text-slate-100 truncate">{title}</h1>
          <p className="hidden sm:block text-xs text-slate-500 font-semibold">
            {now.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
          </p>
        </div>

        {/* Cloche notifications */}
        <button
          onClick={() => navigate('/orders')}
          className="order-3 md:order-4 relative p-2 text-slate-400 hover:text-white hover:bg-navy-700 rounded-xl transition-colors flex-shrink-0"
          title="Notifications"
        >
          <Bell size={18}/>
          {unread > 0 && (
            <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-red-500 rounded-full"/>
          )}
        </button>

        {/* GlobalFilters — passe en pleine largeur sous le titre en dessous de md */}
        <div className="w-full md:w-auto order-4 md:order-3">
          <GlobalFilters/>
        </div>
      </div>
    </header>
  )
}
