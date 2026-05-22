import React, { useState, useEffect } from 'react'
import { useQuery, useMutation } from '@tanstack/react-query'
import QRCode from 'qrcode'
import api from '../../services/api'
import { Gift, Copy, Share2, QrCode, Check } from 'lucide-react'
import toast from 'react-hot-toast'

const REFERRAL_BASE_URL = 'https://app.ifefd.com/join'

function useQRDataUrl(text: string) {
  const [dataUrl, setDataUrl] = useState('')
  useEffect(() => {
    if (!text) { setDataUrl(''); return }
    QRCode.toDataURL(text, { width: 200, margin: 2, color: { dark: '#e2e8f0', light: '#0a1628' } })
      .then(setDataUrl).catch(() => setDataUrl(''))
  }, [text])
  return dataUrl
}

interface ReferralTabProps {
  /** ID de l'utilisateur (User.id) — pour CLIENT directement, pour PRO/DRIVER passer user.id du owner */
  userId: string
}

export const ReferralTab: React.FC<ReferralTabProps> = ({ userId }) => {
  const [copied, setCopied] = useState<'code' | 'link' | null>(null)

  const { data, isLoading, refetch } = useQuery({
    queryKey: ['referral-code', userId],
    queryFn: () => api.get(`/admin/users/${userId}/referral-code`)
      .then((r: any) => r?.data?.data ?? r?.data),
    enabled: !!userId,
  })

  const referralCode: string | null = data?.referralCode ?? null
  const referralUrl = referralCode ? `${REFERRAL_BASE_URL}/${referralCode}` : ''
  const qrDataUrl = useQRDataUrl(referralUrl)

  const generateMutation = useMutation({
    mutationFn: () => api.post(`/admin/users/${userId}/referral-code`, {}),
    onSuccess: () => { toast.success('Code de parrainage généré !'); refetch() },
    onError: (e: any) => toast.error(e.message),
  })

  const copyText = async (text: string, type: 'code' | 'link') => {
    await navigator.clipboard.writeText(text)
    setCopied(type)
    toast.success('Copié !')
    setTimeout(() => setCopied(null), 2000)
  }

  const share = async () => {
    if (navigator.share) {
      await navigator.share({ title: 'Rejoins IFE Food !', url: referralUrl }).catch(() => {})
    } else {
      await copyText(referralUrl, 'link')
    }
  }

  if (isLoading) {
    return <div className="flex justify-center py-10"><div className="w-6 h-6 border-2 border-brand-green border-t-transparent rounded-full animate-spin"/></div>
  }

  if (!referralCode) {
    return (
      <div className="flex flex-col items-center justify-center py-10 gap-4">
        <div className="w-16 h-16 rounded-2xl bg-brand-green/10 border border-brand-green/20 flex items-center justify-center">
          <Gift size={28} className="text-brand-green"/>
        </div>
        <div className="text-center">
          <div className="text-sm font-bold text-slate-200 mb-1">Aucun code de parrainage</div>
          <div className="text-xs text-slate-500">Générez un code unique pour cet utilisateur.</div>
        </div>
        <button onClick={() => generateMutation.mutate()} disabled={generateMutation.isPending}
          className="btn-primary">
          <Gift size={15}/> {generateMutation.isPending ? 'Génération…' : 'Générer un code'}
        </button>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="card-sm p-4">
        <div className="text-xs text-slate-500 font-bold mb-2">Code de parrainage</div>
        <div className="flex items-center gap-3">
          <div className="flex-1 font-black text-2xl text-brand-green tracking-widest">{referralCode}</div>
          <button onClick={() => copyText(referralCode, 'code')}
            className="p-2 text-slate-400 hover:text-white hover:bg-navy-700 rounded-lg transition-all">
            {copied === 'code' ? <Check size={16} className="text-brand-green"/> : <Copy size={16}/>}
          </button>
        </div>
      </div>

      <div className="card-sm p-4">
        <div className="text-xs text-slate-500 font-bold mb-2">Lien de parrainage</div>
        <div className="flex items-center gap-2">
          <span className="flex-1 text-xs font-mono text-slate-300 truncate">{referralUrl}</span>
          <button onClick={() => copyText(referralUrl, 'link')}
            className="p-2 text-slate-400 hover:text-white hover:bg-navy-700 rounded-lg transition-all flex-shrink-0">
            {copied === 'link' ? <Check size={16} className="text-brand-green"/> : <Copy size={16}/>}
          </button>
          <button onClick={share}
            className="p-2 text-slate-400 hover:text-white hover:bg-navy-700 rounded-lg transition-all flex-shrink-0">
            <Share2 size={16}/>
          </button>
        </div>
      </div>

      <div className="card-sm p-4 flex flex-col items-center gap-3">
        <div className="text-xs text-slate-500 font-bold self-start">QR Code</div>
        {qrDataUrl
          ? <img src={qrDataUrl} alt="QR Code parrainage" className="rounded-xl" width={160} height={160}/>
          : <div className="w-40 h-40 rounded-xl bg-navy-700 flex items-center justify-center">
              <QrCode size={40} className="text-slate-600 animate-pulse"/>
            </div>
        }
        {qrDataUrl && (
          <a href={qrDataUrl} download={`parrainage-${referralCode}.png`}
            className="btn-secondary text-xs px-3">
            Télécharger
          </a>
        )}
      </div>
    </div>
  )
}
