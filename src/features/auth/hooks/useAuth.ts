import { router } from "expo-router"
import { useState } from "react"

import { routes } from "@/constants/routes"

import {
  signIn as signInService,
  signOut as signOutService,
  signUp as signUpService,
} from "../services/auth-service"
import type { SignInInput, SignUpInput } from "../schemas/auth-schemas"

export function useAuth() {
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  async function signIn(input: SignInInput) {
    setIsSubmitting(true)
    setErrorMessage(null)

    const result = await signInService(input)

    setIsSubmitting(false)

    if (!result.success) {
      setErrorMessage(result.message ?? "Não foi possível entrar.")
      return
    }

    router.replace(routes.home)
  }

  async function signUp(input: SignUpInput) {
    setIsSubmitting(true)
    setErrorMessage(null)

    const result = await signUpService(input)

    setIsSubmitting(false)

    if (!result.success) {
      setErrorMessage(result.message ?? "Não foi possível criar a conta.")
      return
    }

    router.replace(routes.home)
  }

  async function signOut() {
    const result = await signOutService()

    if (!result.success) {
      setErrorMessage(result.message ?? "Não foi possível sair da conta.")
      return
    }

    router.replace(routes.login)
  }

  return {
    errorMessage,
    isSubmitting,
    signIn,
    signUp,
    signOut,
  }
}
