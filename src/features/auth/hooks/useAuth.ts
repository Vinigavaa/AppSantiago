import { router } from "expo-router"
import { useState } from "react"

import { routes } from "@/constants/routes"

import {
  signIn as signInService,
  signOut as signOutService,
  signUp as signUpService,
  requestPasswordReset as requestPasswordResetService,
  resetPassword as resetPasswordService,
} from "../services/auth-service"
import {
  clearPendingVerificationEmail,
  savePendingPasswordReset,
  savePendingVerificationEmail,
} from "../storage"
import type {
  ForgotPasswordInput,
  ResetPasswordInput,
  SignInInput,
  SignUpInput,
} from "../schemas/auth-schemas"

export function useAuth() {
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  async function signIn(input: SignInInput) {
    if (isSubmitting) {
      return
    }

    setIsSubmitting(true)
    setErrorMessage(null)

    const result = await signInService(input)

    setIsSubmitting(false)

    if (!result.success) {
      setErrorMessage(result.message ?? "Não foi possível entrar.")
      return
    }

    await clearPendingVerificationEmail()
    router.replace(routes.home)
  }

  async function signUp(input: SignUpInput) {
    if (isSubmitting) {
      return
    }

    setIsSubmitting(true)
    setErrorMessage(null)

    const result = await signUpService(input)

    setIsSubmitting(false)

    if (!result.success) {
      setErrorMessage(result.message ?? "Não foi possível criar a conta.")
      return
    }

    await savePendingVerificationEmail(input.email)
    router.replace({ pathname: "/verify-email", params: { email: input.email } })
  }

  async function signOut() {
    if (isSubmitting) {
      return
    }

    setIsSubmitting(true)
    setErrorMessage(null)

    const result = await signOutService()

    if (!result.success) {
      setIsSubmitting(false)
      setErrorMessage(result.message ?? "Não foi possível sair da conta.")
      return
    }

    // Mantém isSubmitting travado enquanto navega para o login (evita toque duplo).
    router.replace(routes.login)
  }

  async function requestPasswordReset(input: ForgotPasswordInput) {
    if (isSubmitting) {
      return
    }

    setIsSubmitting(true)
    setErrorMessage(null)

    const result = await requestPasswordResetService(input)

    if (!result.success || !result.requestId) {
      setIsSubmitting(false)
      setErrorMessage(result.message ?? "Não foi possível solicitar a redefinição.")
      return
    }

    // O requestId é o segredo que autoriza este aparelho a buscar o token.
    await savePendingPasswordReset({ email: input.email, requestId: result.requestId })

    // Mantém isSubmitting travado enquanto navega (evita toque duplo).
    router.replace({ pathname: "/verify-password-reset", params: { email: input.email } })
  }

  async function resetPassword(token: string, input: ResetPasswordInput) {
    if (isSubmitting) {
      return
    }

    setIsSubmitting(true)
    setErrorMessage(null)

    const result = await resetPasswordService(token, input)

    if (!result.success) {
      setIsSubmitting(false)
      setErrorMessage(result.message ?? "Não foi possível redefinir a senha.")
      return
    }

    router.replace(routes.login)
  }

  return {
    errorMessage,
    isSubmitting,
    requestPasswordReset,
    resetPassword,
    signIn,
    signUp,
    signOut,
  }
}
