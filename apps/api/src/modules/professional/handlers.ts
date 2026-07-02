import { prisma } from "@santiago/database"
import { z } from "zod"

import { serializeOwnProposal } from "@/modules/proposals/serialize"
import { serializeServiceRequest, serviceRequestInclude } from "@/modules/service-requests/serialize"
import type { AuthedContext } from "@/modules/shared/require-auth"

import { getProfessionalCoverage } from "./professional-context"

const idSchema = z.uuid()

function forbidden(context: AuthedContext) {
  return context.json(
    { code: "FORBIDDEN", message: "Disponível apenas para profissionais." },
    403,
  )
}

// Início do mês corrente (00:00 do dia 1), para os indicadores do dashboard.
function startOfMonth(): Date {
  const now = new Date()
  return new Date(now.getFullYear(), now.getMonth(), 1)
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
      user: { select: { name: true } },
    },
  })

  return context.json({
    opportunity: serializeServiceRequest(request),
    myProposal: ownProposal ? serializeOwnProposal(ownProposal) : null,
    client: client
      ? {
          name: firstName(client.user.name),
          ratingAverage: Number(client.ratingAverage),
          ratingCount: client.ratingCount,
        }
      : null,
  })
}

// Indicadores de desempenho do mês. Retorna zeros quando ainda não há registros.
export async function professionalDashboardHandler(context: AuthedContext) {
  const user = context.get("user")

  if (user.role !== "PROFESSIONAL") {
    return forbidden(context)
  }

  const profile = await prisma.professionalProfile.upsert({
    where: { userId: user.id },
    update: {},
    create: { userId: user.id },
    select: { id: true, ratingAverage: true, ratingCount: true },
  })

  const monthStart = startOfMonth()

  const [proposalsThisMonth, completedThisMonth] = await Promise.all([
    prisma.proposal.count({
      where: { professionalId: profile.id, createdAt: { gte: monthStart } },
    }),
    prisma.serviceContract.count({
      where: {
        professionalId: profile.id,
        status: "COMPLETED",
        completedAt: { gte: monthStart },
      },
    }),
  ])

  return context.json({
    completedThisMonth,
    proposalsThisMonth,
    ratingAverage: Number(profile.ratingAverage),
    ratingCount: profile.ratingCount,
  })
}
