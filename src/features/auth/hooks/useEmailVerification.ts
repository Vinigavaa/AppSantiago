import { useCallback, useEffect, useRef, useState } from "react"
import { AppState } from "react-native"

import {
  isEmailVerified,
  resendVerificationEmail,
  trySignInForVerification,
} from "../services/auth-service"
import { getPendingCredentials } from "../services/pending-credentials"
import { getVerificationSentAt, saveVerificationSentAt } from "../services/verification-storage"

const COOLDOWN_SECONDS = 60
// Evita disparar logins silenciosos em sequência (rate limit de login é por IP).
const MIN_SILENT_INTERVAL_MS = 2500

type ResendStatus = "idle" | "loading" | "success" | "error"

type Params = {
  email: string | null
  onVerified: () => void
}

export function useEmailVerification({ email, onVerified }: Params) {
  const [resendStatus, setResendStatus] = useState<ResendStatus>("idle")
  const [resendMessage, setResendMessage] = useState<string | null>(null)
  const [cooldownRemaining, setCooldownRemaining] = useState(0)
  const [isChecking, setIsChecking] = useState(false)
  const [checkMessage, setCheckMessage] = useState<string | null>(null)

  // Mantém o callback atual sem redisparar os efeitos de ciclo de vida.
  const onVerifiedRef = useRef(onVerified)
  onVerifiedRef.current = onVerified

  const lastAttemptRef = useRef(0)

  const syncCooldown = useCallback(async () => {
    const sentAt = await getVerificationSentAt()

    if (!sentAt) {
      setCooldownRemaining(0)
      return
    }

    const elapsed = Math.floor((Date.now() - sentAt) / 1000)
    setCooldownRemaining(Math.max(0, COOLDOWN_SECONDS - elapsed))
  }, [])

  // Considera verificado se já existe sessão OU se o login silencioso passa
  // (o que só ocorre depois que o email é confirmado no servidor).
  const attemptVerification = useCallback(async (force: boolean): Promise<boolean> => {
    const now = Date.now()

    if (!force && now - lastAttemptRef.current < MIN_SILENT_INTERVAL_MS) {
      return false
    }

    lastAttemptRef.current = now

    if (await isEmailVerified().catch(() => false)) {
      onVerifiedRef.current()
      return true
    }

    const credentials = getPendingCredentials()

    if (credentials) {
      const signedIn = await trySignInForVerification(
        credentials.email,
        credentials.password,
      ).catch(() => false)

      if (signedIn) {
        onVerifiedRef.current()
        return true
      }
    }

    return false
  }, [])

  // Contador regressivo do cooldown.
  useEffect(() => {
    if (cooldownRemaining <= 0) {
      return
    }

    const timeoutId = setTimeout(() => {
      setCooldownRemaining((seconds) => seconds - 1)
    }, 1000)

    return () => clearTimeout(timeoutId)
  }, [cooldownRemaining])

  // Ao montar: restaura cooldown persistido e checa o status silenciosamente.
  useEffect(() => {
    void syncCooldown()
    void attemptVerification(false)
  }, [syncCooldown, attemptVerification])

  // Ao voltar para o primeiro plano: re-sincroniza cooldown e re-checa o status.
  useEffect(() => {
    const subscription = AppState.addEventListener("change", (state) => {
      if (state === "active") {
        void syncCooldown()
        void attemptVerification(false)
      }
    })

    return () => subscription.remove()
  }, [syncCooldown, attemptVerification])

  const resend = useCallback(async () => {
    if (!email || resendStatus === "loading" || cooldownRemaining > 0) {
      return
    }

    setResendStatus("loading")
    setResendMessage(null)
    setCheckMessage(null)

    const result = await resendVerificationEmail(email)

    if (!result.success) {
      setResendStatus("error")
      setResendMessage(result.message ?? "Não foi possível reenviar o email. Tente novamente.")
      return
    }

    await saveVerificationSentAt(Date.now())
    setResendStatus("success")
    setResendMessage("Email reenviado. Confira sua caixa de entrada e o spam.")
    setCooldownRemaining(COOLDOWN_SECONDS)
  }, [email, resendStatus, cooldownRemaining])

  const checkNow = useCallback(async () => {
    if (isChecking) {
      return
    }

    setIsChecking(true)
    setCheckMessage(null)

    const verified = await attemptVerification(true)

    setIsChecking(false)

    if (!verified) {
      setCheckMessage(
        "Ainda não confirmamos seu email. Clique no link enviado e tente novamente.",
      )
    }
  }, [isChecking, attemptVerification])

  return {
    resendStatus,
    resendMessage,
    cooldownRemaining,
    isResendDisabled: resendStatus === "loading" || cooldownRemaining > 0,
    resend,
    isChecking,
    checkNow,
    checkMessage,
  }
}
