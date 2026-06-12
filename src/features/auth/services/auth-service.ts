import { authBaseUrl, authClient } from "@/lib/auth-client"

import type {
  ForgotPasswordInput,
  ResetPasswordInput,
  SignInInput,
  SignUpInput,
} from "../schemas/auth-schemas"

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

  if (normalized.includes("email_not_verified") || normalized.includes("email not verified") || normalized.includes("verify")) {
    return "Verifique seu email antes de entrar."
  }

  if (normalized.includes("rate") || normalized.includes("too many")) {
    return "Muitas tentativas. Aguarde um pouco e tente novamente."
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

  return {
    success: true,
    message: "Conta criada. Verifique seu email antes de entrar.",
  }
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

async function postAuth(path: string, body: Record<string, unknown>) {
  const response = await fetch(`${authBaseUrl}/api/auth${path}`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
    },
    body: JSON.stringify(body),
  })

  const payload = (await response.json().catch(() => null)) as { message?: string } | null

  if (!response.ok) {
    return {
      success: false,
      message: getFriendlyAuthError(payload?.message),
    }
  }

  return { success: true }
}

export async function requestPasswordReset(input: ForgotPasswordInput): Promise<AuthResult> {
  const result = await postAuth("/request-password-reset", {
    email: input.email,
  })

  if (!result.success) {
    return result
  }

  return {
    success: true,
    message: "Se o email existir, enviaremos um link de redefinição.",
  }
}

export async function resetPassword(input: ResetPasswordInput): Promise<AuthResult> {
  const result = await postAuth("/reset-password", {
    token: input.token,
    newPassword: input.password,
  })

  if (!result.success) {
    return result
  }

  return {
    success: true,
    message: "Senha redefinida. Entre com sua nova senha.",
  }
}
