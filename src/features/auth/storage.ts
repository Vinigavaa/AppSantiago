import { getSecureItem, removeSecureItem, saveSecureItem } from "@/services/secure-storage"

// Email aguardando verificação. Persistido para que a tela de verificação
// continue funcionando caso o usuário feche e reabra o aplicativo.
const PENDING_VERIFICATION_EMAIL_KEY = "pending-verification-email"

export function savePendingVerificationEmail(email: string) {
  return saveSecureItem(PENDING_VERIFICATION_EMAIL_KEY, email)
}

export function getPendingVerificationEmail() {
  return getSecureItem(PENDING_VERIFICATION_EMAIL_KEY)
}

export function clearPendingVerificationEmail() {
  return removeSecureItem(PENDING_VERIFICATION_EMAIL_KEY)
}
