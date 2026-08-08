import { Alert } from "react-native"

import { authBaseUrl, authClient } from "@/lib/auth-client"

export type ApiResult<T> =
  | { ok: true; data: T }
  | { ok: false; error: string; status?: number; code?: string }

type ApiErrorBody = {
  message?: string
  code?: string
}

function friendlyError(status: number, body: ApiErrorBody | null): string {
  if (status === 401) {
    return "Sua sessão expirou. Entre novamente para continuar."
  }

  if (status === 403) {
    return body?.message ?? "Você não tem permissão para esta ação."
  }

  if (status === 429) {
    return "Muitas tentativas. Aguarde um pouco e tente novamente."
  }

  if (status >= 500) {
    return "Servidor indisponível no momento. Tente novamente em instantes."
  }

  return body?.message ?? "Não foi possível concluir a operação. Tente novamente."
}

// Tempo máximo por requisição. Sem isso, uma conexão que morre (ex.: servidor
// reiniciando) deixa a Promise pendurada para sempre e a tela fica girando.
const REQUEST_TIMEOUT_MS = 30_000

// E-mail de contato para quem teve a conta suspensa e quer contestar. Mesmo
// endereço publicado nos Termos de Uso.
const SUPPORT_EMAIL = "maosaobra@suporte.com.br"

// Conta suspensa é um estado terminal: qualquer rota autenticada responde 403
// enquanto durar. O tratamento fica aqui, num ponto só, porque pode chegar em
// qualquer tela — explicamos o motivo e encerramos a sessão local, o que leva o
// usuário de volta ao login pelo layout privado.
//
// A trava evita o efeito de várias telas carregando em paralelo: sem ela, o
// usuário veria o mesmo alerta uma vez por requisição em voo.
let isHandlingSuspension = false

function handleSuspension(message: string) {
  if (isHandlingSuspension) {
    return
  }

  isHandlingSuspension = true

  Alert.alert("Conta suspensa", `${message}\n\nDúvidas ou contestação: ${SUPPORT_EMAIL}`, [
    {
      text: "Entendi",
      onPress: async () => {
        await authClient.signOut().catch(() => {})
        isHandlingSuspension = false
      },
    },
  ])
}

// Cliente para as rotas autenticadas do app (/api/app/*). Anexa o cookie de
// sessão do better-auth (necessário no mobile; na web o navegador já o envia).
export async function appFetch<T>(
  path: string,
  options?: { method?: string; body?: unknown },
): Promise<ApiResult<T>> {
  // AbortController garante que a requisição sempre termine (sucesso, erro ou
  // timeout), então a UI nunca fica presa esperando indefinidamente.
  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS)

  try {
    const headers: Record<string, string> = { "content-type": "application/json" }
    const cookie = authClient.getCookie()

    if (cookie) {
      headers.Cookie = cookie
    }

    const response = await fetch(`${authBaseUrl}/api/app${path}`, {
      method: options?.method ?? "GET",
      headers,
      credentials: "include",
      body: options?.body === undefined ? undefined : JSON.stringify(options.body),
      signal: controller.signal,
    })

    const payload = (await response.json().catch(() => null)) as T | ApiErrorBody | null

    if (!response.ok) {
      const body = payload as ApiErrorBody | null
      const error = friendlyError(response.status, body)

      if (body?.code === "ACCOUNT_SUSPENDED") {
        handleSuspension(error)
      }

      return {
        ok: false,
        error,
        status: response.status,
        code: body?.code,
      }
    }

    return { ok: true, data: payload as T }
  } catch (error) {
    // Abort = estourou o timeout; demais = falha de rede.
    if (error instanceof Error && error.name === "AbortError") {
      return {
        ok: false,
        error: "A conexão demorou demais. Verifique sua internet e tente novamente.",
      }
    }

    return {
      ok: false,
      error: "Não foi possível conectar ao servidor. Verifique sua conexão.",
    }
  } finally {
    clearTimeout(timeoutId)
  }
}
