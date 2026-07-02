import type { Prisma } from "@prisma/client"

// Relações necessárias para a tela "Propostas Recebidas" do cliente: identidade
// e reputação do profissional + a solicitação relacionada. Não expõe contato.
export const clientProposalInclude = {
  professional: {
    select: {
      ratingAverage: true,
      ratingCount: true,
      user: { select: { name: true, displayUsername: true, avatarUrl: true } },
    },
  },
  serviceRequest: {
    select: { id: true, title: true, category: { select: { name: true } } },
  },
  // Contrato da proposta aceita: status atual do serviço e data da aceitação,
  // exibidos na aba "Aceitas".
  serviceContract: { select: { status: true, acceptedAt: true } },
} satisfies Prisma.ProposalInclude

type ClientProposalWithRelations = Prisma.ProposalGetPayload<{
  include: typeof clientProposalInclude
}>

// Formato consumido pelo mobile na área do cliente.
export function serializeClientProposal(proposal: ClientProposalWithRelations) {
  return {
    id: proposal.id,
    price: Number(proposal.price),
    message: proposal.description,
    estimatedDays: proposal.estimatedDays,
    status: proposal.status,
    createdAt: proposal.createdAt.toISOString(),
    professional: {
      id: proposal.professionalId,
      name: proposal.professional.user.displayUsername ?? proposal.professional.user.name,
      avatarUrl: proposal.professional.user.avatarUrl,
      ratingAverage: Number(proposal.professional.ratingAverage),
      ratingCount: proposal.professional.ratingCount,
    },
    serviceRequest: {
      id: proposal.serviceRequest.id,
      title: proposal.serviceRequest.title,
      category: proposal.serviceRequest.category.name,
    },
    contract: proposal.serviceContract
      ? {
          status: proposal.serviceContract.status,
          acceptedAt: proposal.serviceContract.acceptedAt.toISOString(),
        }
      : null,
  }
}

// Resumo da proposta do próprio profissional (exibida no detalhe da oportunidade
// para evitar envio duplicado e preparar a futura edição).
export function serializeOwnProposal(proposal: {
  id: string
  price: Prisma.Decimal
  description: string
  estimatedDays: number | null
  status: string
  createdAt: Date
}) {
  return {
    id: proposal.id,
    price: Number(proposal.price),
    message: proposal.description,
    estimatedDays: proposal.estimatedDays,
    status: proposal.status,
    createdAt: proposal.createdAt.toISOString(),
  }
}
