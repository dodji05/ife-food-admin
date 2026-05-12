import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { QueryClient, QueryClientProvider, MutationCache } from '@tanstack/react-query'
import { Toaster } from 'react-hot-toast'
import toast from 'react-hot-toast'
import App from './App'
import './index.css'

// FIX: onError global pour toutes les mutations + gcTime réduit pour données sensibles
const queryClient = new QueryClient({
  mutationCache: new MutationCache({
    onError: (error: any) => {
      // Les mutations avec leur propre onError ne seront pas affectées
      toast.error(error?.message || 'Une erreur est survenue')
    },
  }),
  defaultOptions: {
    queries: {
      staleTime: 30000,
      retry: 1,
      gcTime: 60000, // 1 min (au lieu de 5 min par défaut) pour données sensibles admin
    },
  },
})

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <App />
        <Toaster position="top-right" toastOptions={{
          style: { background: '#142A50', color: '#E2E8F0', border: '1px solid #1E3A6A', fontFamily: 'Nunito', fontWeight: 600 },
          success: { iconTheme: { primary: '#1A6B3C', secondary: '#fff' } },
          error: { iconTheme: { primary: '#EF4444', secondary: '#fff' } },
        }} />
      </BrowserRouter>
    </QueryClientProvider>
  </React.StrictMode>
)
