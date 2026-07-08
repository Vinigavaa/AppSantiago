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
// Apenas nota e total — não expõe quem avaliou.
export type OpportunityClient = {
  name: string
  ratingAverage: number
  ratingCount: number
}

// Perfil público do profissional, consultado pelo cliente antes de contratar.
// Não traz dados de contato — apenas identidade, reputação e atuação.
export type PublicProfessional = {
  id: string
  name: string
  avatarUrl: string | null
  bio: string | null
  mainCategory: string | null
  categories: { id: string; name: string }[]
  cities: { id: string; name: string; state: string }[]
  ratingAverage: number
  ratingCount: number
  stats: { servicesCompleted: number }
  reviews: PublicReview[]
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
