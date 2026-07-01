// Contrato das propostas, espelhando /api/app/proposals. Compartilhado entre a
// área do cliente (propostas recebidas) e a do profissional (proposta enviada).

export type ProposalStatus = "PENDING" | "ACCEPTED" | "REJECTED" | "CANCELED"

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
