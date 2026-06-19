// As oportunidades exibidas ao profissional são solicitações de serviço reais
// criadas por clientes — mesmo contrato já consumido na área do cliente.
export type { ServiceRequest as Opportunity } from "@/features/service-requests/types"

export type ProfessionalDashboard = {
  completedThisMonth: number
  proposalsThisMonth: number
  ratingAverage: number
  ratingCount: number
}

export type RatingDistribution = Record<"1" | "2" | "3" | "4" | "5", number>

export type ProfessionalStats = {
  servicesCompleted: number
  proposalsSent: number
  hireRate: number
}

export type ProfessionalProfileInfo = {
  name: string
  displayName: string | null
  email: string
  phone: string | null
  bio: string | null
  avatarUrl: string | null
  mainCategory: string | null
  categories: { id: string; name: string }[]
  cities: { id: string; name: string; state: string }[]
  ratingAverage: number
  ratingCount: number
  ratingDistribution: RatingDistribution
  stats: ProfessionalStats
}

export type ProfessionalReview = {
  id: string
  rating: number
  comment: string | null
  createdAt: string
  serviceTitle: string
  serviceCategory: string
}

export type UpdateProfileInput = {
  name: string
  displayName: string | null
  phone: string | null
  bio: string | null
}
