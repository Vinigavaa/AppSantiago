import { appFetch, type ApiResult } from "@/lib/api-client"

// Cancelamento de serviço (contrato). O backend valida se o usuário é o cliente
// ou o profissional do contrato e se o status ainda permite cancelar.
export async function cancelContract(
  id: string,
  reason?: string,
): Promise<ApiResult<{ ok: true }>> {
  return appFetch<{ ok: true }>(`/contracts/${id}/cancel`, {
    method: "POST",
    body: { reason: reason?.trim() || undefined },
  })
}
