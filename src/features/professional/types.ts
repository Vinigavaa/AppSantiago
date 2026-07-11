// As oportunidades exibidas ao profissional são solicitações de serviço reais
// criadas por clientes — mesmo contrato já consumido na área do cliente.
export type { ServiceRequest as Opportunity } from "@/features/service-requests/types"

// Indicadores do painel do profissional. Cada número é um atalho para uma lista
// já filtrada na tela de serviços; totalEarned considera só serviços concluídos.
export type ProfessionalDashboard = {
  servicesToStart: number
  servicesInProgress: number
  rejectedProposals: number
  totalEarned: number
}

// Proposta recusada pelo cliente, exibida no filtro "Propostas recusadas".
export type RejectedProposal = {
  id: string
  price: number
  message: string
  estimatedDays: number | null
  createdAt: string
  serviceRequest: { title: string; category: string; city: { name: string; state: string } }
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

// Avaliação exibida no perfil público (mostra só o primeiro nome do avaliador).
export type PublicReview = {
  id: string
  rating: number
  comment: string | null
  createdAt: string
  reviewerName: string
  serviceCategory: string
}

// Reputação do cliente exibida ao profissional na oportunidade (antes de propor).
// Apenas nota e total — não expõe quem avaliou. `userId` permite iniciar conversa.
export type OpportunityClient = {
  userId: string
  name: string
  ratingAverage: number
  ratingCount: number
}

// Perfil público do profissional, consultado pelo cliente antes de contratar.
// Não traz dados de contato — apenas identidade, reputação e atuação.
export type PublicProfessional = {
  id: string
  // userId da pessoa por trás do perfil — usado para iniciar uma conversa.
  userId: string
  name: string
  avatarUrl: string | null
  bio: string | null
  mainCategory: string | null
  categories: { id: string; name: string }[]
  cities: { id: string; name: string; state: string }[]
  ratingAverage: number
  ratingCount: number
  // Se o cliente que consulta bloqueou este profissional. Quando true, a tela
  // troca "Conversar" por "Desbloquear". (Se o profissional tivesse bloqueado o
  // cliente, o perfil nem seria retornado.)
  blockedByMe: boolean
  stats: { servicesCompleted: number }
  reviews: PublicReview[]
}

// Cartão de profissional na busca/descoberta. Só dados públicos reais.
export type ProfessionalSummary = {
  id: string
  userId: string
  name: string
  avatarUrl: string | null
  bio: string | null
  mainCategory: string | null
  categories: { id: string; name: string }[]
  cities: { id: string; name: string; state: string }[]
  ratingAverage: number
  ratingCount: number
  servicesCompleted: number
  experience: number | null
}

// Critérios de ordenação da busca de profissionais.
export type ProfessionalSort = "rating" | "reviews" | "experience" | "recent"

// Filtros combináveis da busca. Campos vazios/nulos = sem aquele filtro.
export type ProfessionalSearchFilters = {
  q: string
  categoryId: string | null
  cityId: string | null
  minRating: number | null
  sort: ProfessionalSort
}

export type UpdateProfileInput = {
  name: string
  displayName: string | null
  phone: string | null
  bio: string | null
}

export type ServiceContractStatus = "ACCEPTED" | "IN_PROGRESS" | "COMPLETED" | "CANCELED"

// Endereço completo, liberado apenas para o profissional contratado.
export type ServiceAddress = {
  street: string | null
  number: string | null
  neighborhood: string | null
  complement: string | null
  zipCode: string | null
}

// Serviço contratado exibido em "Meus Serviços".
export type ProfessionalService = {
  id: string
  status: ServiceContractStatus
  acceptedAt: string
  startedAt: string | null
  completedAt: string | null
  // Se o profissional já avaliou o cliente deste serviço concluído.
  clientReviewed: boolean
  price: number
  estimatedDays: number | null
  serviceRequest: {
    id: string
    title: string
    description: string
    category: string
    city: { name: string; state: string }
    address: ServiceAddress
  }
  client: { name: string; phone: string | null }
}
