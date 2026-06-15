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

type AuthErrorDetails = {
  message?: string
  code?: string
  status?: number
}

function getFriendlyAuthError(error?: AuthErrorDetails | string | null) {
  const details: AuthErrorDetails =
    typeof error === "string" ? { message: error } : error ?? {}

  const normalized = (details.message ?? "").toLowerCase()
  const code = (details.code ?? "").toUpperCase()

  if (
    details.status === 429 ||
    code === "RATE_LIMITED" ||
    normalized.includes("muitas tentativas") ||
    normalized.includes("rate") ||
    normalized.includes("too many")
  ) {
    return "Muitas tentativas. Aguarde alguns minutos e tente novamente."
  }

  if (details.status === 503 || code === "AUTH_PROTECTION_UNAVAILABLE") {
    return "Servidor indisponível no momento. Tente novamente em instantes."
  }

  if (!details.message) {
    return "Não foi possível autenticar agora. Tente novamente."
  }

  if (normalized.includes("invalid username") || normalized.includes("invalid email") || normalized.includes("invalid password")) {
    return "Credenciais inválidas. Confira os dados e tente novamente."
  }

  if (normalized.includes("email_not_verified") || normalized.includes("email not verified") || normalized.includes("verify")) {
    return "Verifique seu email antes de entrar."
  }

  if (normalized.includes("already") || normalized.includes("taken") || normalized.includes("já existe")) {
    return "Já existe uma conta com esses dados."
  }

  if (normalized.includes("network") || normalized.includes("fetch") || normalized.includes("failed to fetch")) {
    return "Não foi possível conectar ao servidor. Verifique sua conexão."
  }

  return "Não foi possível concluir a autenticação. Tente novamente."
}

function toAuthErrorDetails(error: unknown): AuthErrorDetails {
  if (!error || typeof error !== "object") {
    return {}
  }

  const candidate = error as { message?: unknown; code?: unknown; status?: unknown }

  return {
    message: typeof candidate.message === "string" ? candidate.message : undefined,
    code: typeof candidate.code === "string" ? candidate.code : undefined,
    status: typeof candidate.status === "number" ? candidate.status : undefined,
  }
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
      message: getFriendlyAuthError(toAuthErrorDetails(response.error)),
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
      message: getFriendlyAuthError(toAuthErrorDetails(response.error)),
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
      message: getFriendlyAuthError(toAuthErrorDetails(response.error)),
    }
  }

  return { success: true }
}

export async function resendVerificationEmail(email: string): Promise<AuthResult> {
  const response = await authClient.sendVerificationEmail({ email })

  if (response.error) {
    return {
      success: false,
      message: getFriendlyAuthError(toAuthErrorDetails(response.error)),
    }
  }

  return { success: true }
}

export async function isEmailVerified(): Promise<boolean> {
  const response = await authClient.getSession()

  return Boolean(response.data?.user?.emailVerified)
}

// Tenta logar silenciosamente. Enquanto o email não está verificado o servidor
// recusa (requireEmailVerification); assim que verificado, o login cria a sessão
// no app. Retorna true apenas quando a sessão é estabelecida.
export async function trySignInForVerification(
  email: string,
  password: string,
): Promise<boolean> {
  const response = await authClient.signIn.email({ email, password })

  return !response.error
}

async function postAuth(path: string, body: Record<string, unknown>) {
  const response = await fetch(`${authBaseUrl}/api/auth${path}`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
    },
    body: JSON.stringify(body),
  })

  const payload = (await response.json().catch(() => null)) as
    | { message?: string; code?: string }
    | null

  if (!response.ok) {
    return {
      success: false,
      message: getFriendlyAuthError({
        message: payload?.message,
        code: payload?.code,
        status: response.status,
      }),
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
