import { prisma } from "@santiago/database"
import type { Prisma } from "@prisma/client"
import { z } from "zod"

import { sendPushToUser } from "@/modules/notifications/push"
import type { AuthedContext } from "@/modules/shared/require-auth"

import { getOrCreateProfessionalProfileId } from "./professional-context"

const idSchema = z.uuid()

// Relações do contrato exibidas em "Meus Serviços". Inclui o endereço completo,
// que só é liberado aqui — para o profissional efetivamente contratado.
const contractInclude = {
  proposal: { select: { price: true, estimatedDays: true } },
  serviceRequest: {
    select: {
      id: true,
      title: true,
      description: true,
      category: { select: { name: true } },
      city: { select: { name: true, state: true } },
      addressStreet: true,
      addressNumber: true,
      addressNeighborhood: true,
      addressComplement: true,
      addressZipCode: true,
      client: { select: { user: { select: { name: true, phone: true } } } },
    },
  },
} satisfies Prisma.ServiceContractInclude

type ContractWithRelations = Prisma.ServiceContractGetPayload<{ include: typeof contractInclude }>

function serializeContractedService(contract: ContractWithRelations, clientReviewed: boolean) {
  const request = contract.serviceRequest

  return {
    id: contract.id,
    status: contract.status,
    acceptedAt: contract.acceptedAt.toISOString(),
    startedAt: contract.startedAt?.toISOString() ?? null,
    completedAt: contract.completedAt?.toISOString() ?? null,
    // Se o profissional já avaliou o cliente deste serviço (esconde o CTA).
    clientReviewed,
    price: Number(contract.proposal.price),
    estimatedDays: contract.proposal.estimatedDays,
    serviceRequest: {
      id: request.id,
      title: request.title,
      description: request.description,
      category: request.category.name,
      city: { name: request.city.name, state: request.city.state },
      // Endereço completo liberado apenas para o profissional contratado.
      address: {
        street: request.addressStreet,
        number: request.addressNumber,
        neighborhood: request.addressNeighborhood,
        complement: request.addressComplement,
        zipCode: request.addressZipCode,
      },
    },
    client: {
      name: request.client.user.name,
      phone: request.client.user.phone,
    },
  }
}

// "Meus Serviços": contratos do profissional (contratados, em andamento,
// concluídos). Aparecem automaticamente assim que o cliente aceita a proposta.
export async function professionalServicesHandler(context: AuthedContext) {
  const user = context.get("user")

  if (user.role !== "PROFESSIONAL") {
    return context.json({ code: "FORBIDDEN", message: "Disponível apenas para profissionais." }, 403)
  }

  const professionalId = await getOrCreateProfessionalProfileId(user.id)

  const contracts = await prisma.serviceContract.findMany({
    // Contratos que o próprio profissional cancelou (desistência) somem da lista
    // dele. Cancelamentos feitos pelo cliente continuam visíveis como histórico.
    where: { professionalId, NOT: { status: "CANCELED", canceledBy: user.id } },
    include: contractInclude,
    orderBy: { acceptedAt: "desc" },
  })

  // Contratos que este profissional já avaliou (avaliação do cliente).
  const reviewed = await prisma.review.findMany({
    where: { reviewerId: user.id, serviceContractId: { in: contracts.map((c) => c.id) } },
    select: { serviceContractId: true },
  })
  const reviewedIds = new Set(reviewed.map((review) => review.serviceContractId))

  return context.json({
    services: contracts.map((contract) =>
      serializeContractedService(contract, reviewedIds.has(contract.id)),
    ),
  })
}

// Carrega um contrato garantindo que pertence ao profissional autenticado.
// Retorna { error } pronto para devolver, ou { contract } válido.
async function loadContractForPro(context: AuthedContext) {
  const user = context.get("user")

  if (user.role !== "PROFESSIONAL") {
    return {
      error: context.json(
        { code: "FORBIDDEN", message: "Disponível apenas para profissionais." },
        403,
      ),
    }
  }

  const id = context.req.param("id")

  if (!idSchema.safeParse(id).success) {
    return { error: context.json({ code: "INVALID_ID", message: "Serviço inválido." }, 400) }
  }

  const professionalId = await getOrCreateProfessionalProfileId(user.id)

  const contract = await prisma.serviceContract.findUnique({
    where: { id },
    select: {
      id: true,
      status: true,
      professionalId: true,
      serviceRequestId: true,
      client: { select: { userId: true } },
    },
  })

  if (!contract) {
    return { error: context.json({ code: "NOT_FOUND", message: "Serviço não encontrado." }, 404) }
  }

  if (contract.professionalId !== professionalId) {
    return {
      error: context.json(
        { code: "FORBIDDEN", message: "Este serviço não pertence a você." },
        403,
      ),
    }
  }

  return { contract }
}

// Recarrega o contrato já com as relações e o devolve serializado.
async function respondWithService(context: AuthedContext, id: string) {
  const user = context.get("user")

  const [contract, review] = await Promise.all([
    prisma.serviceContract.findUnique({ where: { id }, include: contractInclude }),
    prisma.review.findFirst({
      where: { reviewerId: user.id, serviceContractId: id },
      select: { id: true },
    }),
  ])

  return context.json({ service: serializeContractedService(contract!, Boolean(review)) })
}

// Iniciar atendimento: ACCEPTED -> IN_PROGRESS. Marca a solicitação também.
export async function startServiceHandler(context: AuthedContext) {
  const loaded = await loadContractForPro(context)
  if ("error" in loaded) {
    return loaded.error
  }

  const { contract } = loaded

  if (contract.status !== "ACCEPTED") {
    return context.json(
      { code: "INVALID_TRANSITION", message: "Só é possível iniciar um serviço contratado." },
      409,
    )
  }

  await prisma.$transaction([
    prisma.serviceContract.update({
      where: { id: contract.id },
      data: { status: "IN_PROGRESS", startedAt: new Date() },
    }),
    prisma.serviceRequest.update({
      where: { id: contract.serviceRequestId },
      data: { status: "IN_PROGRESS" },
    }),
    prisma.notification.create({
      data: {
        userId: contract.client.userId,
        type: "SERVICE_UPDATED",
        title: "Serviço iniciado",
        message: "O profissional iniciou o atendimento do seu serviço.",
      },
    }),
  ])

  void sendPushToUser(
    contract.client.userId,
    "Serviço iniciado",
    "O profissional iniciou o atendimento do seu serviço.",
  )

  return respondWithService(context, contract.id)
}

// Concluir atendimento: IN_PROGRESS -> COMPLETED. Habilita a avaliação do cliente.
export async function completeServiceHandler(context: AuthedContext) {
  const loaded = await loadContractForPro(context)
  if ("error" in loaded) {
    return loaded.error
  }

  const { contract } = loaded

  if (contract.status !== "IN_PROGRESS") {
    return context.json(
      { code: "INVALID_TRANSITION", message: "Só é possível concluir um serviço em andamento." },
      409,
    )
  }

  await prisma.$transaction([
    prisma.serviceContract.update({
      where: { id: contract.id },
      data: { status: "COMPLETED", completedAt: new Date() },
    }),
    prisma.serviceRequest.update({
      where: { id: contract.serviceRequestId },
      data: { status: "COMPLETED" },
    }),
    prisma.notification.create({
      data: {
        userId: contract.client.userId,
        type: "SERVICE_UPDATED",
        title: "Serviço concluído",
        message: "O serviço foi concluído. Que tal avaliar o profissional?",
      },
    }),
  ])

  void sendPushToUser(
    contract.client.userId,
    "Serviço concluído",
    "O serviço foi concluído. Que tal avaliar o profissional?",
  )

  return respondWithService(context, contract.id)
}
