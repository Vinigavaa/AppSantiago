import type { RatingDistribution, ReviewItem } from "./reputation-types"

// Estatísticas do cliente exibidas no perfil (painel de acompanhamento).
export type ClientStats = {
  requestsCreated: number
  servicesCompleted: number
  professionalsHired: number
}

// Perfil completo do cliente. Só dados reais do usuário autenticado.
export type ClientProfileInfo = {
  name: string
  username: string | null
  email: string
  phone: string | null
  avatarUrl: string | null
  memberSince: string
  mainCity: { name: string; state: string } | null
  ratingAverage: number
  ratingCount: number
  ratingDistribution: RatingDistribution
  stats: ClientStats
}

// Avaliação recebida pelo cliente (mesmo formato da lista compartilhada).
export type ClientReview = ReviewItem

export type UpdateClientProfileInput = {
  name: string
  phone: string | null
}
