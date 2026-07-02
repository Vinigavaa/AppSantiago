// Contrato das propostas, espelhando /api/app/proposals. Compartilhado entre a
// área do cliente (propostas recebidas) e a do profissional (proposta enviada).

export type ProposalStatus = "PENDING" | "ACCEPTED" | "REJECTED" | "CANCELED"

export type ServiceStatus = "ACCEPTED" | "IN_PROGRESS" | "COMPLETED" | "CANCELED"

// Proposta exibida ao cliente em "Propostas Recebidas".
export type ReceivedProposal = {
  id: string
  price: number
  message: string
  estimatedDays: number | null
  status: ProposalStatus
  createdAt: string
  professional: {
    id: string
    name: string
    avatarUrl: string | null
    ratingAverage: number
    ratingCount: number
  }
  serviceRequest: { id: string; title: string; category: string }
  // Presente quando a proposta foi aceita (contrato criado).
  contract: { status: ServiceStatus; acceptedAt: string } | null
}

// Resumo da proposta do próprio profissional (no detalhe da oportunidade).
export type OwnProposal = {
  id: string
  price: number
  message: string
  estimatedDays: number | null
  status: ProposalStatus
  createdAt: string
}

export type CreateProposalInput = {
  serviceRequestId: string
  price: number
  message: string
  estimatedDays: number | null
}
