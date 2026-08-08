import { appFetch, type ApiResult } from "@/lib/api-client"

import type { ReportReason, ReportTargetType } from "./types"

// Denuncia um usuário ou um conteúdo. A análise é feita pela moderação em até 24h
// — o app só registra o caso. Denunciar o mesmo alvo de novo é inofensivo: o
// backend mantém o registro original e responde sucesso do mesmo jeito.
export async function reportContent(input: {
  targetType: ReportTargetType
  targetId: string
  reason: ReportReason
  details?: string
}): Promise<ApiResult<void>> {
  const result = await appFetch<{ reported: boolean }>("/reports", {
    method: "POST",
    body: {
      targetType: input.targetType,
      targetId: input.targetId,
      reason: input.reason,
      ...(input.details?.trim() ? { details: input.details.trim() } : {}),
    },
  })

  return result.ok ? { ok: true, data: undefined } : result
}
