import React, { useEffect } from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
import { useAuthStore } from './store/auth'
import { ConfirmProvider } from './hooks/useConfirm'
import { Layout } from './components/layout/Layout'
import { Login } from './pages/auth/Login'
import { Dashboard } from './pages/dashboard/Dashboard'
import { Orders } from './pages/orders/Orders'
import { Users } from './pages/users/Users'
import { Professionals } from './pages/professionals/Professionals'
import { Drivers } from './pages/drivers/Drivers'
import { Catalogue } from './pages/catalogue/Catalogue'
import { Payments } from './pages/payments/Payments'
import { Content } from './pages/content/Content'
import { Settings } from './pages/settings/Settings'
import { Analytics } from './pages/analytics/Analytics'
import { PromoCodes } from './pages/promos/PromoCodes'
import { Referrals } from './pages/referrals/Referrals'

const ProtectedRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, initializing, initialize } = useAuthStore()

  useEffect(() => {
    initialize()
  }, [])

  if (initializing) {
    return (
      <div className="min-h-screen bg-navy-950 flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-brand-green border-t-transparent rounded-full animate-spin"/>
      </div>
    )
  }

  if (!user || user.role !== 'ADMIN') return <Navigate to="/login" replace/>
  return <>{children}</>
}

export default function App() {
  return (
    <ConfirmProvider>
      <Routes>
        <Route path="/login" element={<Login/>}/>
        <Route path="/" element={<ProtectedRoute><Layout/></ProtectedRoute>}>
          <Route index element={<Navigate to="/dashboard" replace/>}/>
          <Route path="dashboard"     element={<Dashboard/>}/>
          <Route path="orders"        element={<Orders/>}/>
          <Route path="analytics"     element={<Analytics/>}/>
          <Route path="users"         element={<Users/>}/>
          <Route path="professionals" element={<Professionals/>}/>
          <Route path="drivers"       element={<Drivers/>}/>
          <Route path="catalogue"     element={<Catalogue/>}/>
          <Route path="payments"      element={<Payments/>}/>
          <Route path="content"       element={<Content/>}/>
          <Route path="promo-codes"   element={<PromoCodes/>}/>
          <Route path="referrals"     element={<Referrals/>}/>
          <Route path="settings"      element={<Settings/>}/>
        </Route>
        <Route path="*" element={<Navigate to="/dashboard" replace/>}/>
      </Routes>
    </ConfirmProvider>
  )
}
