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

// Solicitação de redefinição aguardando confirmação por email. O `requestId` é
// o segredo que autoriza este aparelho a buscar o token de redefinição, então
// vive no armazenamento seguro junto com o email exibido na tela.
const PENDING_PASSWORD_RESET_KEY = "pending-password-reset"

type PendingPasswordReset = {
  email: string
  requestId: string
}

export function savePendingPasswordReset(pending: PendingPasswordReset) {
  return saveSecureItem(PENDING_PASSWORD_RESET_KEY, JSON.stringify(pending))
}

export async function getPendingPasswordReset(): Promise<PendingPasswordReset | null> {
  const stored = await getSecureItem(PENDING_PASSWORD_RESET_KEY)

  if (!stored) {
    return null
  }

  try {
    const parsed = JSON.parse(stored) as Partial<PendingPasswordReset>

    if (typeof parsed.email !== "string" || typeof parsed.requestId !== "string") {
      return null
    }

    return { email: parsed.email, requestId: parsed.requestId }
  } catch {
    // Valor corrompido: tratar como ausente e deixar o usuário recomeçar.
    return null
  }
}

export function clearPendingPasswordReset() {
  return removeSecureItem(PENDING_PASSWORD_RESET_KEY)
}
