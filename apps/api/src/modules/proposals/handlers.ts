import { prisma } from "@santiago/database"
import { Prisma } from "@prisma/client"
import { z } from "zod"

import { getBlockedUserIds, isBlockedBetween } from "@/modules/blocks/service"
import { sendPushToUser, sendPushToUsers } from "@/modules/notifications/push"
import { getProfessionalCoverage } from "@/modules/professional/professional-context"
import type { AuthedContext } from "@/modules/shared/require-auth"

import { createProposalSchema } from "./schemas"
import { clientProposalInclude, serializeClientProposal, serializeOwnProposal } from "./serialize"

const idSchema = z.uuid()

function forbidden(context: AuthedContext, message: string) {
  return context.json({ code: "FORBIDDEN", message }, 403)
}

function invalidData(context: AuthedContext, message: string) {
  return context.json({ code: "INVALID_DATA", message }, 400)
}

function notFound(context: AuthedContext) {
  return context.json({ code: "NOT_FOUND", message: "Proposta não encontrada." }, 404)
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

  // Cliente bloqueado (em qualquer direção): a solicitação fica indisponível.
  if (await isBlockedBetween(user.id, request.client.userId)) {
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

  void sendPushToUser(
    request.client.userId,
    "Nova proposta recebida",
    "Você recebeu uma nova proposta para seu serviço.",
  )

  return context.json({ proposal: serializeOwnProposal(proposal) }, 201)
}

// Cliente lista todas as propostas recebidas nas suas solicitações.
export async function listReceivedProposalsHandler(context: AuthedContext) {
  const user = context.get("user")

  if (user.role !== "CLIENT") {
    return forbidden(context, "Disponível apenas para clientes.")
  }

  // Propostas de profissionais bloqueados (em qualquer direção) somem da caixa.
  const blockedUserIds = await getBlockedUserIds(user.id)

  const proposals = await prisma.proposal.findMany({
    where: {
      serviceRequest: { client: { userId: user.id } },
      professional: { user: { id: { notIn: blockedUserIds } } },
    },
    include: clientProposalInclude,
    orderBy: { createdAt: "desc" },
  })

  return context.json({ proposals: proposals.map(serializeClientProposal) })
}

// Carrega uma proposta para gerenciamento pelo cliente, validando a posse e o
// estado. Retorna a proposta ou uma resposta de erro já pronta.
async function loadProposalForOwner(context: AuthedContext, action: "accept" | "reject") {
  const user = context.get("user")

  if (user.role !== "CLIENT") {
    return { error: forbidden(context, "Disponível apenas para clientes.") } as const
  }

  const id = context.req.param("id")

  if (!idSchema.safeParse(id).success) {
    return { error: context.json({ code: "INVALID_ID", message: "Proposta inválida." }, 400) } as const
  }

  const proposal = await prisma.proposal.findUnique({
    where: { id },
    select: {
      id: true,
      status: true,
      serviceRequestId: true,
      professionalId: true,
      professional: { select: { userId: true } },
      serviceRequest: {
        select: { status: true, clientId: true, client: { select: { userId: true } } },
      },
    },
  })

  if (!proposal) {
    return { error: notFound(context) } as const
  }

  if (proposal.serviceRequest.client.userId !== user.id) {
    return { error: forbidden(context, "Você não pode gerenciar esta proposta.") } as const
  }

  // Só propostas pendentes podem ser respondidas: uma aceita não pode ser
  // recusada depois e vice-versa.
  if (proposal.status !== "PENDING") {
    const message =
      action === "accept"
        ? "Esta proposta já foi respondida e não pode ser aceita."
        : "Esta proposta já foi respondida e não pode ser recusada."
    return { error: context.json({ code: "ALREADY_ANSWERED", message }, 409) } as const
  }

  return { proposal } as const
}

async function respondWithUpdatedProposal(context: AuthedContext, id: string) {
  const updated = await prisma.proposal.findUnique({
    where: { id },
    include: clientProposalInclude,
  })

  if (!updated) {
    return notFound(context)
  }

  return context.json({ proposal: serializeClientProposal(updated) })
}

// Cliente aceita uma proposta: cria o contrato, marca a solicitação como
// contratada (não recebe mais propostas) e recusa as demais propostas pendentes.
export async function acceptProposalHandler(context: AuthedContext) {
  const loaded = await loadProposalForOwner(context, "accept")

  if ("error" in loaded) {
    return loaded.error
  }

  const { proposal } = loaded

  if (proposal.serviceRequest.status !== "OPEN") {
    return context.json(
      { code: "REQUEST_CLOSED", message: "Esta solicitação não está mais aberta." },
      409,
    )
  }

  // Profissionais não escolhidos: serão recusados e notificados.
  const siblings = await prisma.proposal.findMany({
    where: { serviceRequestId: proposal.serviceRequestId, status: "PENDING", id: { not: proposal.id } },
    select: { professional: { select: { userId: true } } },
  })

  try {
    await prisma.$transaction([
      prisma.serviceContract.create({
        data: {
          serviceRequestId: proposal.serviceRequestId,
          proposalId: proposal.id,
          clientId: proposal.serviceRequest.clientId,
          professionalId: proposal.professionalId,
          status: "ACCEPTED",
        },
      }),
      prisma.proposal.update({ where: { id: proposal.id }, data: { status: "ACCEPTED" } }),
      prisma.proposal.updateMany({
        where: { serviceRequestId: proposal.serviceRequestId, status: "PENDING", id: { not: proposal.id } },
        data: { status: "REJECTED" },
      }),
      prisma.serviceRequest.update({
        where: { id: proposal.serviceRequestId },
        data: { status: "ACCEPTED" },
      }),
      prisma.notification.create({
        data: {
          userId: proposal.professional.userId,
          type: "PROPOSAL_ACCEPTED",
          title: "Proposta aceita",
          message: "Sua proposta foi aceita.",
        },
      }),
      ...(siblings.length > 0
        ? [
            prisma.notification.createMany({
              data: siblings.map((sibling) => ({
                userId: sibling.professional.userId,
                type: "PROPOSAL_REJECTED" as const,
                title: "Proposta não selecionada",
                message: "Sua proposta não foi selecionada.",
              })),
            }),
          ]
        : []),
    ])
  } catch (error) {
    // Corrida de aceites concorrentes: o índice único de proposalId no contrato
    // impede um segundo contrato. Tratamos como "já respondida" em vez de 500.
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      return context.json(
        { code: "ALREADY_ANSWERED", message: "Esta proposta já foi respondida." },
        409,
      )
    }
    throw error
  }

  void sendPushToUser(proposal.professional.userId, "Proposta aceita", "Sua proposta foi aceita.")
  if (siblings.length > 0) {
    void sendPushToUsers(
      siblings.map((sibling) => sibling.professional.userId),
      "Proposta não selecionada",
      "Sua proposta não foi selecionada.",
    )
  }

  return respondWithUpdatedProposal(context, proposal.id)
}

// Cliente recusa uma proposta. A solicitação continua aberta para outras.
export async function rejectProposalHandler(context: AuthedContext) {
  const loaded = await loadProposalForOwner(context, "reject")

  if ("error" in loaded) {
    return loaded.error
  }

  const { proposal } = loaded

  await prisma.$transaction([
    prisma.proposal.update({ where: { id: proposal.id }, data: { status: "REJECTED" } }),
    prisma.notification.create({
      data: {
        userId: proposal.professional.userId,
        type: "PROPOSAL_REJECTED",
        title: "Proposta não selecionada",
        message: "Sua proposta não foi selecionada.",
      },
    }),
  ])

  void sendPushToUser(
    proposal.professional.userId,
    "Proposta não selecionada",
    "Sua proposta não foi selecionada.",
  )

  return respondWithUpdatedProposal(context, proposal.id)
}

// Profissional cancela a própria proposta enquanto ela estiver pendente. Após
// ser aceita ou recusada não há mais o que cancelar.
export async function cancelProposalHandler(context: AuthedContext) {
  const user = context.get("user")

  if (user.role !== "PROFESSIONAL") {
    return forbidden(context, "Apenas profissionais podem cancelar propostas.")
  }

  const id = context.req.param("id")

  if (!idSchema.safeParse(id).success) {
    return context.json({ code: "INVALID_ID", message: "Proposta inválida." }, 400)
  }

  const proposal = await prisma.proposal.findUnique({
    where: { id },
    select: { id: true, status: true, professional: { select: { userId: true } } },
  })

  if (!proposal) {
    return notFound(context)
  }

  if (proposal.professional.userId !== user.id) {
    return forbidden(context, "Você não pode cancelar esta proposta.")
  }

  if (proposal.status !== "PENDING") {
    return context.json(
      { code: "NOT_PENDING", message: "Só é possível cancelar uma proposta pendente." },
      409,
    )
  }

  const updated = await prisma.proposal.update({
    where: { id: proposal.id },
    data: { status: "CANCELED" },
    select: {
      id: true,
      price: true,
      description: true,
      estimatedDays: true,
      status: true,
      createdAt: true,
    },
  })

  return context.json({ proposal: serializeOwnProposal(updated) })
}
