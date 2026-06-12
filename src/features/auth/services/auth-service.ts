import { authClient } from "@/lib/auth-client"

import type { SignInInput, SignUpInput } from "../schemas/auth-schemas"

type AuthResult = {
  success: boolean
  message?: string
}

function getFriendlyAuthError(message?: string) {
  if (!message) {
    return "Não foi possível autenticar agora. Tente novamente."
  }

  const normalized = message.toLowerCase()

  if (normalized.includes("invalid username") || normalized.includes("invalid email") || normalized.includes("invalid password")) {
    return "Credenciais inválidas. Confira os dados e tente novamente."
  }

  if (normalized.includes("already") || normalized.includes("taken")) {
    return "Já existe uma conta com esses dados."
  }

  if (normalized.includes("network") || normalized.includes("fetch")) {
    return "Não foi possível conectar ao servidor. Verifique sua conexão."
  }

  return "Não foi possível concluir a autenticação. Tente novamente."
}

export async function signIn(input: SignInInput): Promise<AuthResult> {
  const response = input.username
    ? await authClient.signIn.username({
        username: input.username,
        password: input.password,
      })
    : await authClient.signIn.email({
        email: input.email ?? "",
        password: input.password,
      })

  if (response.error) {
    return {
      success: false,
      message: getFriendlyAuthError(response.error.message),
    }
  }

  return { success: true }
}

export async function signUp(input: SignUpInput): Promise<AuthResult> {
  const response = await authClient.signUp.email({
    name: input.username,
    username: input.username,
    displayUsername: input.username,
    email: input.email,
    password: input.password,
    role: input.role,
  })

  if (response.error) {
    return {
      success: false,
      message: getFriendlyAuthError(response.error.message),
    }
  }

  return { success: true }
}

export async function signOut(): Promise<AuthResult> {
  const response = await authClient.signOut()

  if (response.error) {
    return {
      success: false,
      message: getFriendlyAuthError(response.error.message),
    }
  }

  return { success: true }
}
