import React, { useEffect } from 'react'
import { X } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'

interface Props { open: boolean; onClose: () => void; title: string; children: React.ReactNode; size?: 'sm' | 'md' | 'lg' | 'xl' }

export const Modal: React.FC<Props> = ({ open, onClose, title, children, size = 'md' }) => {
  useEffect(() => {
    if (!open) return
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  }, [open, onClose])

  const widths = { sm: 'max-w-sm', md: 'max-w-lg', lg: 'max-w-2xl', xl: 'max-w-4xl' }

  return (
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose}/>
          <motion.div initial={{ opacity: 0, scale: 0.95, y: 10 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95, y: 10 }}
            onClick={e => e.stopPropagation()}
            className={`relative z-10 bg-navy-800 border border-navy-600 rounded-2xl shadow-2xl w-full max-h-[90vh] flex flex-col ${widths[size]}`}>
            <div className="flex items-center justify-between p-5 border-b border-navy-700 flex-shrink-0">
              <h2 className="text-base font-black text-slate-100">{title}</h2>
              <button onClick={onClose} className="p-1.5 text-slate-400 hover:text-white hover:bg-navy-700 rounded-lg transition-colors"><X size={18}/></button>
            </div>
            <div className="p-5 overflow-y-auto flex-1">{children}</div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  )
}
