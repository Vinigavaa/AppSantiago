import { appFetch, type ApiResult } from "@/lib/api-client"

import type { BlockedUser } from "./types"

// Bloqueia outro usuário. A partir daí ambos somem um do outro (listas, buscas,
// oportunidades e conversas) e não conseguem trocar mensagens.
export async function blockUser(targetUserId: string): Promise<ApiResult<void>> {
  const result = await appFetch<{ blocked: boolean }>("/blocks", {
    method: "POST",
    body: { targetUserId },
  })
  return result.ok ? { ok: true, data: undefined } : result
}

// Desfaz um bloqueio feito pelo usuário atual.
export async function unblockUser(targetUserId: string): Promise<ApiResult<void>> {
  const result = await appFetch<{ blocked: boolean }>(`/blocks/${targetUserId}`, {
    method: "DELETE",
  })
  return result.ok ? { ok: true, data: undefined } : result
}

// Lista os usuários que o usuário atual bloqueou (para gerenciar/desbloquear).
export async function fetchBlockedUsers(): Promise<ApiResult<BlockedUser[]>> {
  const result = await appFetch<{ blocked: BlockedUser[] }>("/blocks")
  return result.ok ? { ok: true, data: result.data.blocked } : result
}
