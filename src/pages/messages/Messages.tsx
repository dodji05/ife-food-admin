import React, { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import api from '../../services/api'
import { formatDateTime } from '../../utils/format'
import { MessageSquare, Search, RefreshCw, ArrowLeft, Circle } from 'lucide-react'

interface Conversation {
  conversationId: string
  lastMessage: { content: string; createdAt: string }
  senderName: string
  messageCount: number
  unreadCount: number
}

interface Message {
  id: string
  senderId: string
  content: string
  createdAt: string
  read: boolean
  sender: { name: string; firstName: string; avatarUrl: string | null }
}

function senderInitials(m: Message) {
  const first = m.sender?.firstName?.[0] ?? ''
  const last  = m.sender?.name?.[0] ?? ''
  return (first + last).toUpperCase() || '?'
}

function senderFull(m: Message) {
  return [m.sender?.firstName, m.sender?.name].filter(Boolean).join(' ') || 'Inconnu'
}

export const Messages: React.FC = () => {
  const [search, setSearch]       = useState('')
  const [selected, setSelected]   = useState<Conversation | null>(null)

  const { data: convos = [], isLoading, refetch, isFetching } = useQuery<Conversation[]>({
    queryKey: ['admin-conversations', search],
    queryFn: async () => {
      const params = new URLSearchParams()
      if (search.trim()) params.set('search', search.trim())
      const res = await api.get(`/admin/messages/conversations${params.size ? '?' + params : ''}`)
      return Array.isArray(res) ? res : (res as any)?.data ?? []
    },
  })

  const { data: messages = [], isLoading: loadingMsgs } = useQuery<Message[]>({
    queryKey: ['admin-conversation', selected?.conversationId],
    queryFn: async () => {
      const res = await api.get(`/admin/messages/${encodeURIComponent(selected!.conversationId)}`)
      return Array.isArray(res) ? res : (res as any)?.data ?? []
    },
    enabled: !!selected,
  })

  return (
    <div className="h-[calc(100vh-8rem)] flex flex-col gap-4">
      <div className="flex items-center justify-between gap-3 flex-shrink-0">
        <div>
          <h1 className="text-xl font-black text-slate-100 flex items-center gap-2">
            <MessageSquare size={20} className="text-brand-green"/> Messagerie interne
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">Conversations entre clients, livreurs et professionnels</p>
        </div>
        <button
          onClick={() => refetch()}
          disabled={isFetching}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-navy-800 hover:bg-navy-700 text-slate-300 text-sm font-semibold rounded-xl transition-colors disabled:opacity-50"
        >
          <RefreshCw size={14} className={isFetching ? 'animate-spin' : ''}/>
          Actualiser
        </button>
      </div>

      <div className="flex flex-1 gap-4 overflow-hidden min-h-0">
        {/* ── Liste des conversations ── */}
        <div className={`flex flex-col bg-navy-900 border border-navy-700 rounded-2xl overflow-hidden
          ${selected ? 'hidden md:flex md:w-80 lg:w-96 flex-shrink-0' : 'flex-1'}`}>
          <div className="p-3 border-b border-navy-700">
            <div className="relative">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500"/>
              <input
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Rechercher une conversation…"
                className="w-full pl-8 pr-3 py-2 bg-navy-800 border border-navy-700 rounded-xl text-sm text-slate-200 placeholder-slate-500 focus:outline-none focus:border-brand-green/50"
              />
            </div>
          </div>

          <div className="flex-1 overflow-y-auto divide-y divide-navy-800">
            {isLoading ? (
              <div className="p-8 text-center text-slate-500 text-sm">Chargement…</div>
            ) : convos.length === 0 ? (
              <div className="p-8 text-center">
                <MessageSquare size={32} className="mx-auto text-slate-600 mb-3"/>
                <p className="text-slate-500 text-sm">Aucune conversation</p>
              </div>
            ) : convos.map(conv => (
              <button
                key={conv.conversationId}
                onClick={() => setSelected(conv)}
                className={`w-full text-left px-4 py-3 transition-colors hover:bg-navy-800
                  ${selected?.conversationId === conv.conversationId ? 'bg-brand-green/10 border-l-2 border-brand-green' : ''}`}
              >
                <div className="flex items-start gap-3">
                  <div className="w-9 h-9 rounded-full bg-brand-green/15 border border-brand-green/20 flex items-center justify-center flex-shrink-0 text-brand-green font-black text-xs">
                    {conv.conversationId.replace('order_', '').substring(0, 2).toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-slate-300 truncate">
                        {conv.conversationId.replace('order_', 'Commande #').substring(0, 18)}
                      </span>
                      {conv.unreadCount > 0 && (
                        <span className="flex-shrink-0 min-w-[18px] h-[18px] rounded-full bg-red-500 text-white text-[9px] font-black flex items-center justify-center px-1">
                          {conv.unreadCount > 99 ? '99+' : conv.unreadCount}
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-slate-500 truncate mt-0.5">{conv.lastMessage.content}</p>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-[10px] text-slate-600">{conv.senderName}</span>
                      <span className="text-[10px] text-slate-700">·</span>
                      <span className="text-[10px] text-slate-600">{conv.messageCount} msg</span>
                      <span className="text-[10px] text-slate-700">·</span>
                      <span className="text-[10px] text-slate-600">{formatDateTime(conv.lastMessage.createdAt)}</span>
                    </div>
                  </div>
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* ── Détail conversation ── */}
        {selected ? (
          <div className="flex-1 flex flex-col bg-navy-900 border border-navy-700 rounded-2xl overflow-hidden">
            <div className="flex items-center gap-3 px-4 py-3 border-b border-navy-700">
              <button
                onClick={() => setSelected(null)}
                className="md:hidden p-1 text-slate-400 hover:text-slate-200 transition-colors"
              >
                <ArrowLeft size={18}/>
              </button>
              <div>
                <p className="text-sm font-bold text-slate-100">
                  {selected.conversationId.replace('order_', 'Commande #')}
                </p>
                <p className="text-xs text-slate-500">{selected.messageCount} messages</p>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-3">
              {loadingMsgs ? (
                <div className="flex items-center justify-center h-full">
                  <div className="w-6 h-6 border-2 border-brand-green border-t-transparent rounded-full animate-spin"/>
                </div>
              ) : messages.length === 0 ? (
                <div className="flex items-center justify-center h-full text-slate-500 text-sm">
                  Aucun message dans cette conversation.
                </div>
              ) : messages.map(msg => (
                <div key={msg.id} className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-full bg-navy-700 border border-navy-600 flex items-center justify-center flex-shrink-0 text-xs font-black text-slate-300">
                    {senderInitials(msg)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-baseline gap-2">
                      <span className="text-xs font-bold text-slate-200">{senderFull(msg)}</span>
                      <span className="text-[10px] text-slate-600">{formatDateTime(msg.createdAt)}</span>
                      {!msg.read && (
                        <Circle size={6} className="text-brand-green fill-brand-green flex-shrink-0"/>
                      )}
                    </div>
                    <p className="text-sm text-slate-300 mt-1 break-words whitespace-pre-wrap">{msg.content}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div className="hidden md:flex flex-1 items-center justify-center bg-navy-900 border border-navy-700 rounded-2xl">
            <div className="text-center">
              <MessageSquare size={40} className="mx-auto text-slate-600 mb-3"/>
              <p className="text-slate-500 text-sm">Sélectionnez une conversation</p>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
