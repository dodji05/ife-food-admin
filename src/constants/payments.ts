export const TX_TYPE_LABELS: Record<string, string> = {
  COMMISSION: 'Commission',
  PAYOUT: 'Virement',
  REFUND: 'Remboursement',
  DELIVERY_FEE: 'Frais livraison',
  TIP: 'Pourboire',
}

export const TX_STATUS_LABELS: Record<string, string> = {
  PENDING: 'En attente',
  COMPLETED: 'Complété',
  FAILED: 'Échoué',
}

export const GATEWAY_ICONS: Record<string, string> = {
  STRIPE: '💳', PAYPAL: '🅿️', KKIAPAY: '📱', FEDAPAY: '🟢', CASH_ON_DELIVERY: '💵', OTHER: '💰',
}

export const GATEWAY_LABELS: Record<string, string> = {
  STRIPE: 'International', PAYPAL: 'Mondial', KKIAPAY: 'Mobile Money', FEDAPAY: 'Bénin',
  CASH_ON_DELIVERY: 'Espèces à la livraison', OTHER: 'Autre',
}

export const GATEWAY_NOTES: Record<string, string> = {
  CASH_ON_DELIVERY: 'Collecté directement par le livreur — aucun traitement en ligne.',
}
