import { appFetch, type ApiResult } from "@/lib/api-client"

import type { ClientProfileInfo, ClientReview, UpdateClientProfileInput } from "./profile-types"

export async function fetchClientProfile(): Promise<ApiResult<ClientProfileInfo>> {
  const result = await appFetch<{ profile: ClientProfileInfo }>("/client/profile")
  return result.ok ? { ok: true, data: result.data.profile } : result
}

export async function updateClientProfile(
  input: UpdateClientProfileInput,
): Promise<ApiResult<ClientProfileInfo>> {
  const result = await appFetch<{ profile: ClientProfileInfo }>("/client/profile", {
    method: "PATCH",
    body: input,
  })
  return result.ok ? { ok: true, data: result.data.profile } : result
}

export async function fetchClientReviews(): Promise<ApiResult<ClientReview[]>> {
  const result = await appFetch<{ reviews: ClientReview[] }>("/client/reviews")
  return result.ok ? { ok: true, data: result.data.reviews } : result
}

// Exclusão definitiva da conta. O backend bloqueia (409) se houver serviço ativo.
export async function deleteClientAccount(): Promise<ApiResult<void>> {
  const result = await appFetch<{ deleted: boolean }>("/client/account", { method: "DELETE" })
  return result.ok ? { ok: true, data: undefined } : result
}
