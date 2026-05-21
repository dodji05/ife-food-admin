import React, { useState, useEffect } from 'react'
import { Outlet, useLocation } from 'react-router-dom'
import { Sidebar } from './Sidebar'
import { Header } from './Header'

export const Layout: React.FC = () => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const { pathname } = useLocation()

  // Le drawer mobile se ferme automatiquement après navigation.
  useEffect(() => { setMobileMenuOpen(false) }, [pathname])

  return (
    <div className="flex min-h-screen bg-navy-950">
      <Sidebar mobileOpen={mobileMenuOpen} onClose={() => setMobileMenuOpen(false)} />
      <div className="flex-1 flex flex-col min-w-0">
        <Header onMenuClick={() => setMobileMenuOpen(true)} />
        <main className="flex-1 p-4 sm:p-6 overflow-auto">
          <Outlet/>
        </main>
      </div>
    </div>
  )
}
