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
import { clearPendingVerificationEmail, savePendingVerificationEmail } from "../storage"
import type {
  ForgotPasswordInput,
  ResetPasswordInput,
  SignInInput,
  SignUpInput,
} from "../schemas/auth-schemas"

export function useAuth() {
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [successMessage, setSuccessMessage] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  async function signIn(input: SignInInput) {
    if (isSubmitting) {
      return
    }

    setIsSubmitting(true)
    setErrorMessage(null)
    setSuccessMessage(null)

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
    setSuccessMessage(null)

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
    setSuccessMessage(null)

    const result = await requestPasswordResetService(input)

    setIsSubmitting(false)

    if (!result.success) {
      setErrorMessage(result.message ?? "Não foi possível solicitar a redefinição.")
      return
    }

    setSuccessMessage(result.message ?? "Se o email existir, enviaremos um link de redefinição.")
  }

  async function resetPassword(input: ResetPasswordInput) {
    if (isSubmitting) {
      return
    }

    setIsSubmitting(true)
    setErrorMessage(null)
    setSuccessMessage(null)

    const result = await resetPasswordService(input)

    setIsSubmitting(false)

    if (!result.success) {
      setErrorMessage(result.message ?? "Não foi possível redefinir a senha.")
      return
    }

    setSuccessMessage(result.message ?? "Senha redefinida. Entre com sua nova senha.")
  }

  return {
    errorMessage,
    isSubmitting,
    requestPasswordReset,
    resetPassword,
    signIn,
    signUp,
    signOut,
    successMessage,
  }
}
