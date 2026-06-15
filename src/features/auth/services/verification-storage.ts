import { getSecureItem, removeSecureItem, saveSecureItem } from "@/services/secure-storage"

const PENDING_EMAIL_KEY = "pending_verification_email"
const SENT_AT_KEY = "verification_last_sent_at"

export async function savePendingVerificationEmail(email: string) {
  await saveSecureItem(PENDING_EMAIL_KEY, email)
}

export async function getPendingVerificationEmail() {
  return getSecureItem(PENDING_EMAIL_KEY)
}

export async function clearPendingVerificationEmail() {
  await removeSecureItem(PENDING_EMAIL_KEY)
  await removeSecureItem(SENT_AT_KEY)
}

export async function saveVerificationSentAt(timestamp: number) {
  await saveSecureItem(SENT_AT_KEY, String(timestamp))
}

export async function getVerificationSentAt(): Promise<number | null> {
  const value = await getSecureItem(SENT_AT_KEY)

  if (!value) {
    return null
  }

  const parsed = Number(value)

  return Number.isFinite(parsed) ? parsed : null
}
