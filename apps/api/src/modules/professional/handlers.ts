import { prisma } from "@santiago/database"
import { z } from "zod"

import { serializeOwnProposal } from "@/modules/proposals/serialize"
import { serializeServiceRequest, serviceRequestInclude } from "@/modules/service-requests/serialize"
import type { AuthedContext } from "@/modules/shared/require-auth"

import { getOrCreateProfessionalProfileId, getProfessionalCoverage } from "./professional-context"

const idSchema = z.uuid()

function forbidden(context: AuthedContext) {
  return context.json(
    { code: "FORBIDDEN", message: "Disponível apenas para profissionais." },
    403,
  )
}

// Só o primeiro nome — preserva a privacidade do cliente/avaliador na vitrine.
function firstName(name: string): string {
  return name.trim().split(/\s+/)[0] ?? name
}

// Oportunidades = solicitações abertas dentro da área de atuação e das cidades
// atendidas pelo profissional. Não expõe endereço/localização precisa.
export async function listOpportunitiesHandler(context: AuthedContext) {
  const user = context.get("user")

  if (user.role !== "PROFESSIONAL") {
    return forbidden(context)
  }

  const coverage = await getProfessionalCoverage(user.id)

  // Sem categorias ou sem cidades definidas não há como filtrar por área/região:
  // o profissional ainda não tem oportunidades compatíveis.
  if (!coverage || coverage.categoryIds.length === 0 || coverage.cityIds.length === 0) {
    return context.json({ opportunities: [] })
  }

  const requests = await prisma.serviceRequest.findMany({
    where: {
      status: "OPEN",
      categoryId: { in: coverage.categoryIds },
      cityId: { in: coverage.cityIds },
      // Não exibir solicitações em que este profissional já enviou proposta
      // (qualquer status): assim que ele propõe, a solicitação sai da home dele.
      NOT: {
        proposals: {
          some: { professionalId: coverage.profileId },
        },
      },
    },
    include: serviceRequestInclude,
    orderBy: { createdAt: "desc" },
  })

  return context.json({ opportunities: requests.map(serializeServiceRequest) })
}

// Detalhe de uma oportunidade. Prepara a futura tela completa da solicitação.
export async function opportunityDetailHandler(context: AuthedContext) {
  const user = context.get("user")

  if (user.role !== "PROFESSIONAL") {
    return forbidden(context)
  }

  const id = context.req.param("id")

  if (!idSchema.safeParse(id).success) {
    return context.json({ code: "INVALID_ID", message: "Solicitação inválida." }, 400)
  }

  const request = await prisma.serviceRequest.findUnique({
    where: { id },
    include: serviceRequestInclude,
  })

  if (!request) {
    return context.json(
      { code: "NOT_FOUND", message: "Solicitação não encontrada." },
      404,
    )
  }

  // Proposta já enviada pelo profissional para esta solicitação (se houver):
  // permite ao app bloquear envio duplicado e exibir o resumo do que foi enviado.
  const coverage = await getProfessionalCoverage(user.id)
  const ownProposal = coverage
    ? await prisma.proposal.findUnique({
        where: {
          serviceRequestId_professionalId: {
            serviceRequestId: request.id,
            professionalId: coverage.profileId,
          },
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
    : null

  // Reputação do cliente: apenas nota média e total de avaliações — sem expor
  // quem avaliou nem os comentários. Ajuda o profissional a decidir antes de propor.
  const client = await prisma.clientProfile.findUnique({
    where: { id: request.clientId },
    select: {
      ratingAverage: true,
      ratingCount: true,
      user: { select: { id: true, name: true } },
    },
  })

  return context.json({
    opportunity: serializeServiceRequest(request),
    myProposal: ownProposal ? serializeOwnProposal(ownProposal) : null,
    client: client
      ? {
          // userId permite ao profissional iniciar uma conversa com o cliente.
          userId: client.user.id,
          name: firstName(client.user.name),
          ratingAverage: Number(client.ratingAverage),
          ratingCount: client.ratingCount,
        }
      : null,
  })
}

// Painel de acompanhamento do profissional. Cada número é um atalho para uma
// lista já filtrada na tela de serviços. Retorna zeros quando não há registros.
//
// - servicesToStart: contratados aguardando início (ACCEPTED)
// - servicesInProgress: em atendimento (IN_PROGRESS)
// - rejectedProposals: propostas recusadas pelos clientes (REJECTED)
// - totalEarned: valor recebido, somando apenas serviços concluídos (COMPLETED)
export async function professionalDashboardHandler(context: AuthedContext) {
  const user = context.get("user")

  if (user.role !== "PROFESSIONAL") {
    return forbidden(context)
  }

  const professionalId = await getOrCreateProfessionalProfileId(user.id)

  const [servicesToStart, servicesInProgress, rejectedProposals, earned] = await Promise.all([
    prisma.serviceContract.count({ where: { professionalId, status: "ACCEPTED" } }),
    prisma.serviceContract.count({ where: { professionalId, status: "IN_PROGRESS" } }),
    prisma.proposal.count({ where: { professionalId, status: "REJECTED" } }),
    // O valor recebido vem do preço da proposta cujo contrato foi concluído.
    prisma.proposal.aggregate({
      _sum: { price: true },
      where: { professionalId, serviceContract: { status: "COMPLETED" } },
    }),
  ])

  return context.json({
    servicesToStart,
    servicesInProgress,
    rejectedProposals,
    totalEarned: Number(earned._sum.price ?? 0),
  })
}

// Propostas do profissional recusadas pelos clientes. Histórico somente leitura,
// acessível pelo filtro "Propostas recusadas" da tela de serviços.
export async function professionalRejectedProposalsHandler(context: AuthedContext) {
  const user = context.get("user")

  if (user.role !== "PROFESSIONAL") {
    return forbidden(context)
  }

  const professionalId = await getOrCreateProfessionalProfileId(user.id)

  const proposals = await prisma.proposal.findMany({
    where: { professionalId, status: "REJECTED" },
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      price: true,
      description: true,
      estimatedDays: true,
      createdAt: true,
      serviceRequest: {
        select: {
          title: true,
          category: { select: { name: true } },
          city: { select: { name: true, state: true } },
        },
      },
    },
  })

  return context.json({
    proposals: proposals.map((proposal) => ({
      id: proposal.id,
      price: Number(proposal.price),
      message: proposal.description,
      estimatedDays: proposal.estimatedDays,
      createdAt: proposal.createdAt.toISOString(),
      serviceRequest: {
        title: proposal.serviceRequest.title,
        category: proposal.serviceRequest.category.name,
        city: {
          name: proposal.serviceRequest.city.name,
          state: proposal.serviceRequest.city.state,
        },
      },
    })),
  })
}
