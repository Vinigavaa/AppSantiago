import { appFetch, type ApiResult } from "@/lib/api-client"
import type { ServiceRequest } from "@/features/service-requests/types"

import type {
  ProfessionalDashboard,
  ProfessionalProfileInfo,
  ProfessionalReview,
  UpdateProfileInput,
} from "./types"

export async function fetchOpportunities(): Promise<ApiResult<ServiceRequest[]>> {
  const result = await appFetch<{ opportunities: ServiceRequest[] }>("/opportunities")
  return result.ok ? { ok: true, data: result.data.opportunities } : result
}

export async function fetchOpportunity(id: string): Promise<ApiResult<ServiceRequest>> {
  const result = await appFetch<{ opportunity: ServiceRequest }>(`/opportunities/${id}`)
  return result.ok ? { ok: true, data: result.data.opportunity } : result
}

export async function fetchProfessionalDashboard(): Promise<ApiResult<ProfessionalDashboard>> {
  return appFetch<ProfessionalDashboard>("/professional/dashboard")
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
