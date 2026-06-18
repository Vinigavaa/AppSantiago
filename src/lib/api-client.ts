import { authBaseUrl, authClient } from "@/lib/auth-client"

export type ApiResult<T> =
  | { ok: true; data: T }
  | { ok: false; error: string; status?: number }

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

// Cliente para as rotas autenticadas do app (/api/app/*). Anexa o cookie de
// sessão do better-auth (necessário no mobile; na web o navegador já o envia).
export async function appFetch<T>(
  path: string,
  options?: { method?: string; body?: unknown },
): Promise<ApiResult<T>> {
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
    })

    const payload = (await response.json().catch(() => null)) as T | ApiErrorBody | null

    if (!response.ok) {
      return {
        ok: false,
        error: friendlyError(response.status, payload as ApiErrorBody | null),
        status: response.status,
      }
    }

    return { ok: true, data: payload as T }
  } catch {
    return {
      ok: false,
      error: "Não foi possível conectar ao servidor. Verifique sua conexão.",
    }
  }
}
