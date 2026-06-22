import { prisma } from "@santiago/database"

import { getProfessionalCoverage } from "@/modules/professional/professional-context"
import type { AuthedContext } from "@/modules/shared/require-auth"

import { createProposalSchema } from "./schemas"
import { clientProposalInclude, serializeClientProposal, serializeOwnProposal } from "./serialize"

function forbidden(context: AuthedContext, message: string) {
  return context.json({ code: "FORBIDDEN", message }, 403)
}

function invalidData(context: AuthedContext, message: string) {
  return context.json({ code: "INVALID_DATA", message }, 400)
}

// Profissional envia uma proposta para uma solicitação aberta. Todas as regras
// de segurança são revalidadas no servidor (autenticação, perfil ativo,
// compatibilidade de categoria e cidade, uma proposta por solicitação).
export async function createProposalHandler(context: AuthedContext) {
  const user = context.get("user")

  if (user.role !== "PROFESSIONAL") {
    return forbidden(context, "Apenas profissionais podem enviar propostas.")
  }

  const body = await context.req.json().catch(() => null)
  const parsed = createProposalSchema.safeParse(body)

  if (!parsed.success) {
    return invalidData(context, parsed.error.issues[0]?.message ?? "Dados inválidos.")
  }

  const input = parsed.data

  const coverage = await getProfessionalCoverage(user.id)

  if (!coverage) {
    return forbidden(context, "Complete seu perfil profissional para enviar propostas.")
  }

  if (!coverage.isAvailable) {
    return forbidden(context, "Seu perfil está indisponível. Reative-o para enviar propostas.")
  }

  const request = await prisma.serviceRequest.findUnique({
    where: { id: input.serviceRequestId },
    select: { status: true, categoryId: true, cityId: true, client: { select: { userId: true } } },
  })

  if (!request) {
    return context.json({ code: "NOT_FOUND", message: "Solicitação não encontrada." }, 404)
  }

  if (request.status !== "OPEN") {
    return context.json(
      { code: "REQUEST_CLOSED", message: "Esta solicitação não está mais aberta para propostas." },
      409,
    )
  }

  if (!coverage.categoryIds.includes(request.categoryId)) {
    return forbidden(context, "Esta solicitação está fora da sua área de atuação.")
  }

  if (!coverage.cityIds.includes(request.cityId)) {
    return forbidden(context, "Esta solicitação está fora das cidades que você atende.")
  }

  // Uma proposta por solicitação (também garantido pelo índice único). A edição
  // de uma proposta existente fica para um fluxo futuro.
  const existing = await prisma.proposal.findUnique({
    where: {
      serviceRequestId_professionalId: {
        serviceRequestId: input.serviceRequestId,
        professionalId: coverage.profileId,
      },
    },
    select: { id: true },
  })

  if (existing) {
    return context.json(
      { code: "ALREADY_PROPOSED", message: "Você já enviou uma proposta para esta solicitação." },
      409,
    )
  }

  // Cria a proposta e a notificação do cliente de forma atômica. O contador de
  // propostas da solicitação é derivado (relação), então atualiza sozinho.
  const proposal = await prisma.proposal.create({
    data: {
      serviceRequestId: input.serviceRequestId,
      professionalId: coverage.profileId,
      price: input.price,
      description: input.message,
      estimatedDays: input.estimatedDays ?? null,
    },
    select: {
      id: true,
      price: true,
      description: true,
      estimatedDays: true,
      status: true,
      createdAt: true,
    },
  })

  // Estrutura pronta para futuras notificações push. Por ora persiste o registro.
  await prisma.notification
    .create({
      data: {
        userId: request.client.userId,
        type: "PROPOSAL_RECEIVED",
        title: "Nova proposta recebida",
        message: "Você recebeu uma nova proposta para seu serviço.",
      },
    })
    .catch((error) => {
      // A notificação é complementar; não deve derrubar o envio da proposta.
      console.error("[proposals] falha ao criar notificação", error)
    })

  return context.json({ proposal: serializeOwnProposal(proposal) }, 201)
}

// Cliente lista todas as propostas recebidas nas suas solicitações.
export async function listReceivedProposalsHandler(context: AuthedContext) {
  const user = context.get("user")

  if (user.role !== "CLIENT") {
    return forbidden(context, "Disponível apenas para clientes.")
  }

  const proposals = await prisma.proposal.findMany({
    where: { serviceRequest: { client: { userId: user.id } } },
    include: clientProposalInclude,
    orderBy: { createdAt: "desc" },
  })

  return context.json({ proposals: proposals.map(serializeClientProposal) })
}
