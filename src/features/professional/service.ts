import { appFetch, type ApiResult } from "@/lib/api-client"
import type { OwnProposal } from "@/features/proposals/types"
import type { ServiceRequest } from "@/features/service-requests/types"

import type {
  OpportunityClient,
  ProfessionalDashboard,
  ProfessionalProfileInfo,
  ProfessionalReview,
  ProfessionalService,
  PublicProfessional,
  RejectedProposal,
  UpdateProfileInput,
} from "./types"

// Perfil público de um profissional (visto pelo cliente ao avaliar uma proposta).
export async function fetchPublicProfessional(
  id: string,
): Promise<ApiResult<PublicProfessional>> {
  const result = await appFetch<{ professional: PublicProfessional }>(`/professionals/${id}`)
  return result.ok ? { ok: true, data: result.data.professional } : result
}

// Detalhe da oportunidade + a proposta já enviada pelo profissional (se houver)
// + a reputação do cliente que abriu a solicitação.
export type OpportunityDetail = {
  opportunity: ServiceRequest
  myProposal: OwnProposal | null
  client: OpportunityClient | null
}

export async function fetchOpportunities(): Promise<ApiResult<ServiceRequest[]>> {
  const result = await appFetch<{ opportunities: ServiceRequest[] }>("/opportunities")
  return result.ok ? { ok: true, data: result.data.opportunities } : result
}

export async function fetchOpportunity(id: string): Promise<ApiResult<OpportunityDetail>> {
  const result = await appFetch<OpportunityDetail>(`/opportunities/${id}`)
  return result.ok
    ? {
        ok: true,
        data: {
          opportunity: result.data.opportunity,
          myProposal: result.data.myProposal,
          client: result.data.client,
        },
      }
    : result
}

export async function fetchProfessionalDashboard(): Promise<ApiResult<ProfessionalDashboard>> {
  return appFetch<ProfessionalDashboard>("/professional/dashboard")
}

export async function fetchProfessionalRejectedProposals(): Promise<ApiResult<RejectedProposal[]>> {
  const result = await appFetch<{ proposals: RejectedProposal[] }>(
    "/professional/proposals/rejected",
  )
  return result.ok ? { ok: true, data: result.data.proposals } : result
}

export async function fetchProfessionalProfile(): Promise<ApiResult<ProfessionalProfileInfo>> {
  const result = await appFetch<{ profile: ProfessionalProfileInfo }>("/professional/profile")
  return result.ok ? { ok: true, data: result.data.profile } : result
}

export async function updateProfessionalProfile(
  input: UpdateProfileInput,
): Promise<ApiResult<ProfessionalProfileInfo>> {
  const result = await appFetch<{ profile: ProfessionalProfileInfo }>("/professional/profile", {
    method: "PATCH",
    body: input,
  })
  return result.ok ? { ok: true, data: result.data.profile } : result
}

export async function setProfessionalCategories(
  categoryIds: string[],
): Promise<ApiResult<ProfessionalProfileInfo>> {
  const result = await appFetch<{ profile: ProfessionalProfileInfo }>("/professional/categories", {
    method: "PUT",
    body: { categoryIds },
  })
  return result.ok ? { ok: true, data: result.data.profile } : result
}

export async function setProfessionalCities(
  cityIds: string[],
): Promise<ApiResult<ProfessionalProfileInfo>> {
  const result = await appFetch<{ profile: ProfessionalProfileInfo }>("/professional/cities", {
    method: "PUT",
    body: { cityIds },
  })
  return result.ok ? { ok: true, data: result.data.profile } : result
}

export async function fetchProfessionalReviews(): Promise<ApiResult<ProfessionalReview[]>> {
  const result = await appFetch<{ reviews: ProfessionalReview[] }>("/professional/reviews")
  return result.ok ? { ok: true, data: result.data.reviews } : result
}

export async function fetchProfessionalServices(): Promise<ApiResult<ProfessionalService[]>> {
  const result = await appFetch<{ services: ProfessionalService[] }>("/professional/services")
  return result.ok ? { ok: true, data: result.data.services } : result
}

export async function startService(id: string): Promise<ApiResult<ProfessionalService>> {
  const result = await appFetch<{ service: ProfessionalService }>(
    `/professional/services/${id}/start`,
    { method: "POST" },
  )
  return result.ok ? { ok: true, data: result.data.service } : result
}

export async function completeService(id: string): Promise<ApiResult<ProfessionalService>> {
  const result = await appFetch<{ service: ProfessionalService }>(
    `/professional/services/${id}/complete`,
    { method: "POST" },
  )
  return result.ok ? { ok: true, data: result.data.service } : result
}
