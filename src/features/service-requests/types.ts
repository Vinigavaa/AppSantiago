// Espelham o contrato retornado por /api/app. Tipagem única consumida pela Home
// e pelo formulário de criação.

export type RequestStatus =
  | "OPEN"
  | "IN_NEGOTIATION"
  | "ACCEPTED"
  | "IN_PROGRESS"
  | "COMPLETED"
  | "CANCELED"

export type Urgency = "URGENT" | "THIS_WEEK" | "FLEXIBLE"

export type Category = {
  id: string
  name: string
  slug: string
}

export type City = {
  id: string
  name: string
  state: string
}

export type ContractStatus = "ACCEPTED" | "IN_PROGRESS" | "COMPLETED" | "CANCELED"

// Presente apenas na listagem do próprio cliente (não nas oportunidades do
// profissional). Habilita o fluxo de avaliação quando o serviço é concluído.
export type RequestContract = {
  id: string
  status: ContractStatus
  professionalName: string
  reviewed: boolean
}

export type ServiceRequest = {
  id: string
  title: string
  description: string
  status: RequestStatus
  urgency: Urgency
  category: { id: string; name: string }
  city: { id: string; name: string; state: string }
  neighborhood: string | null
  budgetMin: number | null
  budgetMax: number | null
  proposalsCount: number
  photosCount: number
  createdAt: string
  contract?: RequestContract | null
}

export type ClientSummary = {
  openRequests: number
  pendingProposals: number
  completedServices: number
}

export type CreateServiceRequestInput = {
  categoryId: string
  cityId: string
  title: string
  description: string
  zipCode: string
  street: string
  number: string
  neighborhood: string
  complement?: string
  urgency: Urgency
  budgetMin?: number
  budgetMax?: number
}
