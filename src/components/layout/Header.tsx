import React from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { Bell } from 'lucide-react'
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

export const Header: React.FC = () => {
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
    <header className="bg-navy-900 border-b border-navy-700 px-6 py-4 flex items-center gap-4">
      <div>
        <h1 className="text-lg font-black text-slate-100">{title}</h1>
        <p className="text-xs text-slate-500 font-semibold">
          {now.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
        </p>
      </div>
      <div className="flex-1"/>
      <GlobalFilters/>
      <button
        onClick={() => navigate('/orders')}
        className="relative p-2 text-slate-400 hover:text-white hover:bg-navy-700 rounded-xl transition-colors"
        title="Notifications"
      >
        <Bell size={18}/>
        {unread > 0 && (
          <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-red-500 rounded-full"/>
        )}
      </button>
    </header>
  )
}
