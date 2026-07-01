import { appFetch, type ApiResult } from "@/lib/api-client"

import type {
  Category,
  City,
  ClientSummary,
  CreateServiceRequestInput,
  ServiceRequest,
  ServiceRequestDetail,
} from "./types"

export async function fetchCategories(): Promise<ApiResult<Category[]>> {
  const result = await appFetch<{ categories: Category[] }>("/categories")
  return result.ok ? { ok: true, data: result.data.categories } : result
}

export async function fetchCities(): Promise<ApiResult<City[]>> {
  const result = await appFetch<{ cities: City[] }>("/cities")
  return result.ok ? { ok: true, data: result.data.cities } : result
}

export async function fetchServiceRequests(): Promise<ApiResult<ServiceRequest[]>> {
  const result = await appFetch<{ requests: ServiceRequest[] }>("/service-requests")
  return result.ok ? { ok: true, data: result.data.requests } : result
}

export async function fetchClientSummary(): Promise<ApiResult<ClientSummary>> {
  return appFetch<ClientSummary>("/service-requests/summary")
}

export async function createServiceRequest(
  input: CreateServiceRequestInput,
): Promise<ApiResult<ServiceRequest>> {
  const result = await appFetch<{ request: ServiceRequest }>("/service-requests", {
    method: "POST",
    body: input,
  })

  return result.ok ? { ok: true, data: result.data.request } : result
}

// Detalhe completo de uma solicitação do próprio cliente (inclui endereço).
export async function fetchServiceRequestDetail(
  id: string,
): Promise<ApiResult<ServiceRequestDetail>> {
  const result = await appFetch<{ request: ServiceRequestDetail }>(`/service-requests/${id}`)
  return result.ok ? { ok: true, data: result.data.request } : result
}

// Edição da solicitação. Reaproveita o mesmo payload da criação.
export async function updateServiceRequest(
  id: string,
  input: CreateServiceRequestInput,
): Promise<ApiResult<ServiceRequestDetail>> {
  const result = await appFetch<{ request: ServiceRequestDetail }>(`/service-requests/${id}`, {
    method: "PATCH",
    body: input,
  })
  return result.ok ? { ok: true, data: result.data.request } : result
}

// Exclusão da solicitação. Bloqueada pelo backend quando já há contrato.
export async function deleteServiceRequest(id: string): Promise<ApiResult<{ ok: true }>> {
  return appFetch<{ ok: true }>(`/service-requests/${id}`, { method: "DELETE" })
}

// Avaliação do profissional após o serviço concluído.
export async function submitReview(input: {
  serviceContractId: string
  rating: number
  comment?: string
}): Promise<ApiResult<{ ok: true }>> {
  return appFetch<{ ok: true }>("/reviews", { method: "POST", body: input })
}
