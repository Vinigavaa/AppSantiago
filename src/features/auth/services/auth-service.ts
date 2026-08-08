import { closeRealtime } from "@/features/realtime/client"
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
  // A conexão de eventos morre com a sessão: sem isso ela tentaria reconectar
  // com uma sessão que não existe mais.
  closeRealtime()

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

export async function getEmailVerificationStatus(
  email: string,
): Promise<AuthResult & { verified: boolean }> {
  try {
    const response = await fetch(
      `${authBaseUrl}/api/auth/email-verification-status?email=${encodeURIComponent(email)}`,
      {
        method: "GET",
        headers: { "content-type": "application/json" },
      },
    )

    const payload = (await response.json().catch(() => null)) as
      | { verified?: boolean; message?: string; code?: string }
      | null

    if (!response.ok) {
      return {
        success: false,
        verified: false,
        message: getFriendlyAuthError({
          message: payload?.message,
          code: payload?.code,
          status: response.status,
        }),
      }
    }

    return { success: true, verified: payload?.verified === true }
  } catch (error) {
    return {
      success: false,
      verified: false,
      message: getFriendlyAuthError(toAuthErrorDetails(error)),
    }
  }
}


type PostAuthResult = AuthResult & {
  payload?: { requestId?: string } | null
}

async function postAuth(
  path: string,
  body: Record<string, unknown>,
): Promise<PostAuthResult> {
  const response = await fetch(`${authBaseUrl}/api/auth${path}`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
    },
    body: JSON.stringify(body),
  })

  const payload = (await response.json().catch(() => null)) as
    | { message?: string; code?: string; requestId?: string }
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

  return { success: true, payload }
}

// Devolve o `requestId` da solicitação: é ele, e não o email, que autoriza o
// app a buscar o token depois que o usuário confirmar pelo link.
export async function requestPasswordReset(
  input: ForgotPasswordInput,
): Promise<AuthResult & { requestId?: string }> {
  try {
    const result = await postAuth("/password-reset-request", {
      email: input.email,
    })

    if (!result.success) {
      return result
    }

    const requestId = result.payload?.requestId

    if (!requestId) {
      return {
        success: false,
        message: "Não foi possível iniciar a redefinição agora. Tente novamente.",
      }
    }

    return { success: true, requestId }
  } catch (error) {
    return {
      success: false,
      message: getFriendlyAuthError(toAuthErrorDetails(error)),
    }
  }
}

// Consultado pelo botão "Já verifiquei meu email". Só devolve o token depois
// que o link do email foi aberto; a solicitação é consumida na entrega.
export async function getPasswordResetStatus(
  requestId: string,
): Promise<AuthResult & { confirmed: boolean; token?: string }> {
  try {
    const response = await fetch(
      `${authBaseUrl}/api/auth/password-reset-status?requestId=${encodeURIComponent(requestId)}`,
      {
        method: "GET",
        headers: { "content-type": "application/json" },
      },
    )

    const payload = (await response.json().catch(() => null)) as
      | { confirmed?: boolean; token?: string; message?: string; code?: string }
      | null

    if (!response.ok) {
      return {
        success: false,
        confirmed: false,
        message: getFriendlyAuthError({
          message: payload?.message,
          code: payload?.code,
          status: response.status,
        }),
      }
    }

    if (payload?.confirmed !== true || !payload.token) {
      return { success: true, confirmed: false }
    }

    return { success: true, confirmed: true, token: payload.token }
  } catch (error) {
    return {
      success: false,
      confirmed: false,
      message: getFriendlyAuthError(toAuthErrorDetails(error)),
    }
  }
}

// O token vem da consulta de status, não digitado pelo usuário.
export async function resetPassword(
  token: string,
  input: ResetPasswordInput,
): Promise<AuthResult> {
  try {
    const result = await postAuth("/reset-password", {
      token,
      newPassword: input.password,
    })

    if (!result.success) {
      return result
    }

    return {
      success: true,
      message: "Senha redefinida. Entre com sua nova senha.",
    }
  } catch (error) {
    return {
      success: false,
      message: getFriendlyAuthError(toAuthErrorDetails(error)),
    }
  }
}
