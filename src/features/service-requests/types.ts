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
  // Presente no detalhe da oportunidade (visão do profissional). A listagem traz
  // apenas photosCount.
  photos?: { id: string; url: string }[]
  createdAt: string
  contract?: RequestContract | null
}

export type RequestAddress = {
  zipCode: string | null
  street: string | null
  number: string | null
  neighborhood: string | null
  complement: string | null
}

// Contrato exibido no detalhe completo da solicitação (para o próprio cliente).
export type RequestDetailContract = {
  id: string
  status: ContractStatus
  professionalId: string
  professionalName: string
  reviewed: boolean
}

// Detalhe completo da solicitação, retornado por GET /service-requests/:id.
// Só o dono recebe o endereço completo.
export type ServiceRequestDetail = {
  id: string
  title: string
  description: string
  status: RequestStatus
  urgency: Urgency
  category: { id: string; name: string }
  city: { id: string; name: string; state: string }
  address: RequestAddress
  budgetMin: number | null
  budgetMax: number | null
  proposalsCount: number
  photos: { id: string; url: string }[]
  createdAt: string
  updatedAt: string
  contract: RequestDetailContract | null
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
  // Fotos recém-enviadas (novas). Na edição, keepPhotoIds lista as existentes
  // que devem permanecer; as demais são removidas.
  photos?: { publicId: string; version: number }[]
  keepPhotoIds?: string[]
}
