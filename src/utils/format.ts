// FIX: Guard sur null/undefined/NaN pour éviter "NaN F" et "Invalid Date" dans l'UI
export const formatCFA = (amount: number | null | undefined): string => {
  if (amount == null || isNaN(Number(amount))) return '—'
  return `${Math.round(amount).toLocaleString('fr-FR')} F`
}
export const formatDate = (date: string | Date | null | undefined): string => {
  if (!date) return '—'
  const d = new Date(date)
  if (isNaN(d.getTime())) return '—'
  return d.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' })
}
export const formatDateTime = (date: string | Date | null | undefined): string => {
  if (!date) return '—'
  const d = new Date(date)
  if (isNaN(d.getTime())) return '—'
  return d.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })
}
export const formatRelative = (date: string | Date | null | undefined): string => {
  if (!date) return '—'
  const d = new Date(date)
  if (isNaN(d.getTime())) return '—'
  const diff = Date.now() - d.getTime()
  if (diff < 60000) return "À l'instant"
  if (diff < 3600000) return `Il y a ${Math.floor(diff / 60000)} min`
  if (diff < 86400000) return `Il y a ${Math.floor(diff / 3600000)}h`
  return formatDate(date)
}
export const statusColor = (s: string): string => ({
  PENDING:'yellow', PAID:'green', ACCEPTED:'blue', IN_PREPARATION:'blue',
  READY_FOR_PICKUP:'blue', DRIVER_ASSIGNED:'blue', PICKED_UP:'blue', IN_DELIVERY:'blue',
  DELIVERED:'green', CANCELLED:'red', REFUNDED:'gray',
  VALIDATED:'green', REJECTED:'red', SUSPENDED:'yellow', BANNED:'red',
  ONLINE:'green', OFFLINE:'gray', ACTIVE:'green', SUCCESS:'green', FAILED:'red',
}[s] || 'gray')
export const statusLabel = (s: string): string => ({
  PENDING:'En attente', PAID:'Payée', ACCEPTED:'Acceptée', IN_PREPARATION:'En prép.',
  READY_FOR_PICKUP:'Prête', DRIVER_ASSIGNED:'Livreur assigné', PICKED_UP:'Récupérée',
  IN_DELIVERY:'En livraison', DELIVERED:'Livrée', CANCELLED:'Annulée', REFUNDED:'Remboursée',
  VALIDATED:'Validé', REJECTED:'Refusé', SUSPENDED:'Suspendu', BANNED:'Banni',
  ONLINE:'En ligne', OFFLINE:'Hors ligne', ACTIVE:'Actif', SUCCESS:'Succès', FAILED:'Échec',
}[s] || s)
