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

// Cliente reporta que o profissional não compareceu: cancela a contratação atual
// e reabre a solicitação para novas propostas.
export async function reportNoShow(
  id: string,
  reason?: string,
): Promise<ApiResult<{ ok: true }>> {
  return appFetch<{ ok: true }>(`/contracts/${id}/no-show`, {
    method: "POST",
    body: { reason: reason?.trim() || undefined },
  })
}
