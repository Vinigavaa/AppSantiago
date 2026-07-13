import { prisma } from "@santiago/database"
import { z } from "zod"

import type { AuthedContext } from "@/modules/shared/require-auth"
import { resolveRequestPhotoUrls } from "@/modules/uploads/handlers"

import { getOrCreateClientProfileId } from "./client-profile"
import { createServiceRequestSchema, MAX_REQUEST_PHOTOS } from "./schemas"
import {
  clientServiceRequestInclude,
  serializeClientServiceRequest,
  serializeServiceRequest,
  serializeServiceRequestDetail,
  serviceRequestDetailInclude,
  serviceRequestInclude,
} from "./serialize"

// Solicitações consideradas "em aberto" no resumo do cliente.
const OPEN_STATUSES = ["OPEN", "IN_NEGOTIATION"] as const

// A solicitação só pode ser editada enquanto não estiver concluída ou cancelada.
const LOCKED_STATUSES = ["COMPLETED", "CANCELED"] as const

const idSchema = z.uuid()

// Padroniza o CEP para "00000-000" antes de salvar.
function normalizeZipCode(value: string): string {
  const digits = value.replace(/\D/g, "")
  return `${digits.slice(0, 5)}-${digits.slice(5, 8)}`
}

export async function createServiceRequestHandler(context: AuthedContext) {
  const user = context.get("user")

  if (user.role !== "CLIENT") {
    return context.json(
      { code: "FORBIDDEN", message: "Apenas clientes podem criar solicitações." },
      403,
    )
  }

  const body = await context.req.json().catch(() => null)
  const parsed = createServiceRequestSchema.safeParse(body)

  if (!parsed.success) {
    return context.json(
      {
        code: "INVALID_DATA",
        message: parsed.error.issues[0]?.message ?? "Dados inválidos.",
      },
      400,
    )
  }

  const input = parsed.data

  // Valida as referências para devolver erros amigáveis em vez de falha de FK.
  const [category, city] = await Promise.all([
    prisma.category.findFirst({
      where: { id: input.categoryId, isActive: true },
      select: { id: true },
    }),
    prisma.city.findUnique({ where: { id: input.cityId }, select: { id: true } }),
  ])

  if (!category) {
    return context.json(
      { code: "INVALID_CATEGORY", message: "Categoria indisponível." },
      400,
    )
  }

  if (!city) {
    return context.json({ code: "INVALID_CITY", message: "Cidade indisponível." }, 400)
  }

  const clientId = await getOrCreateClientProfileId(user.id)

  // Fotos (opcional): valida a posse (pasta do usuario) e monta as URLs finais.
  let photoUrls: string[] = []

  if (input.photos && input.photos.length > 0) {
    const resolved = resolveRequestPhotoUrls(user.id, input.photos)

    if (!resolved.ok) {
      return context.json(
        { code: "INVALID_PHOTOS", message: "Não foi possível anexar as fotos enviadas." },
        400,
      )
    }

    photoUrls = resolved.urls
  }

  const created = await prisma.serviceRequest.create({
    data: {
      clientId,
      categoryId: input.categoryId,
      cityId: input.cityId,
      title: input.title,
      description: input.description,
      urgency: input.urgency,
      addressZipCode: normalizeZipCode(input.zipCode),
      addressStreet: input.street,
      addressNumber: input.number,
      addressNeighborhood: input.neighborhood,
      addressComplement: input.complement ?? null,
      budgetMin: input.budgetMin ?? null,
      budgetMax: input.budgetMax ?? null,
      ...(photoUrls.length > 0
        ? { photos: { create: photoUrls.map((url) => ({ url })) } }
        : {}),
    },
    include: serviceRequestInclude,
  })

  return context.json({ request: serializeServiceRequest(created) }, 201)
}

export async function listServiceRequestsHandler(context: AuthedContext) {
  const user = context.get("user")

  const requests = await prisma.serviceRequest.findMany({
    where: { client: { userId: user.id } },
    include: clientServiceRequestInclude,
    orderBy: { createdAt: "desc" },
  })

  // Marca quais contratos o cliente já avaliou, para o app esconder o CTA.
  const contractIds = requests
    .map((request) => request.serviceContracts[0]?.id)
    .filter((id): id is string => Boolean(id))

  const reviewedContractIds = new Set<string>()
  if (contractIds.length > 0) {
    const reviews = await prisma.review.findMany({
      where: { reviewerId: user.id, serviceContractId: { in: contractIds } },
      select: { serviceContractId: true },
    })
    for (const review of reviews) {
      reviewedContractIds.add(review.serviceContractId)
    }
  }

  return context.json({
    requests: requests.map((request) =>
      serializeClientServiceRequest(request, reviewedContractIds),
    ),
  })
}

// Verifica se o cliente já avaliou o contrato (para o app esconder o CTA).
async function hasReviewed(userId: string, contractId: string | undefined): Promise<boolean> {
  if (!contractId) {
    return false
  }

  const review = await prisma.review.findFirst({
    where: { reviewerId: userId, serviceContractId: contractId },
    select: { id: true },
  })

  return Boolean(review)
}

// Detalhe completo de uma solicitação do próprio cliente. Só o dono acessa —
// aqui o endereço completo é exposto (a listagem pública nunca o revela).
export async function serviceRequestDetailHandler(context: AuthedContext) {
  const user = context.get("user")
  const id = context.req.param("id")

  if (!idSchema.safeParse(id).success) {
    return context.json({ code: "INVALID_ID", message: "Solicitação inválida." }, 400)
  }

  const request = await prisma.serviceRequest.findFirst({
    where: { id, client: { userId: user.id } },
    include: serviceRequestDetailInclude,
  })

  if (!request) {
    return context.json({ code: "NOT_FOUND", message: "Solicitação não encontrada." }, 404)
  }

  const reviewed = await hasReviewed(user.id, request.serviceContracts[0]?.id)

  return context.json({ request: serializeServiceRequestDetail(request, reviewed) })
}

// Edição da solicitação pelo cliente. Permitida enquanto não estiver concluída
// ou cancelada. Reaproveita o schema/validações da criação.
export async function updateServiceRequestHandler(context: AuthedContext) {
  const user = context.get("user")

  if (user.role !== "CLIENT") {
    return context.json(
      { code: "FORBIDDEN", message: "Apenas clientes podem editar solicitações." },
      403,
    )
  }

  const id = context.req.param("id")

  if (!idSchema.safeParse(id).success) {
    return context.json({ code: "INVALID_ID", message: "Solicitação inválida." }, 400)
  }

  const existing = await prisma.serviceRequest.findFirst({
    where: { id, client: { userId: user.id } },
    select: { id: true, status: true },
  })

  if (!existing) {
    return context.json({ code: "NOT_FOUND", message: "Solicitação não encontrada." }, 404)
  }

  if ((LOCKED_STATUSES as readonly string[]).includes(existing.status)) {
    return context.json(
      { code: "REQUEST_LOCKED", message: "Esta solicitação não pode mais ser editada." },
      409,
    )
  }

  const body = await context.req.json().catch(() => null)
  const parsed = createServiceRequestSchema.safeParse(body)

  if (!parsed.success) {
    return context.json(
      { code: "INVALID_DATA", message: parsed.error.issues[0]?.message ?? "Dados inválidos." },
      400,
    )
  }

  const input = parsed.data

  const [category, city] = await Promise.all([
    prisma.category.findFirst({
      where: { id: input.categoryId, isActive: true },
      select: { id: true },
    }),
    prisma.city.findUnique({ where: { id: input.cityId }, select: { id: true } }),
  ])

  if (!category) {
    return context.json({ code: "INVALID_CATEGORY", message: "Categoria indisponível." }, 400)
  }

  if (!city) {
    return context.json({ code: "INVALID_CITY", message: "Cidade indisponível." }, 400)
  }

  // Reconciliação de fotos só ocorre quando o cliente gerencia fotos (edição
  // envia keepPhotoIds). Sem isso, as fotos existentes ficam intactas.
  let newPhotoUrls: string[] = []

  if (input.photos && input.photos.length > 0) {
    const resolved = resolveRequestPhotoUrls(user.id, input.photos)

    if (!resolved.ok) {
      return context.json(
        { code: "INVALID_PHOTOS", message: "Não foi possível anexar as fotos enviadas." },
        400,
      )
    }

    newPhotoUrls = resolved.urls
  }

  const keepIds = input.keepPhotoIds

  if (keepIds !== undefined && keepIds.length + newPhotoUrls.length > MAX_REQUEST_PHOTOS) {
    return context.json(
      {
        code: "TOO_MANY_PHOTOS",
        message: `Você pode anexar no máximo ${MAX_REQUEST_PHOTOS} fotos.`,
      },
      400,
    )
  }

  await prisma.serviceRequest.update({
    where: { id: existing.id },
    data: {
      categoryId: input.categoryId,
      cityId: input.cityId,
      title: input.title,
      description: input.description,
      urgency: input.urgency,
      addressZipCode: normalizeZipCode(input.zipCode),
      addressStreet: input.street,
      addressNumber: input.number,
      addressNeighborhood: input.neighborhood,
      addressComplement: input.complement ?? null,
      budgetMin: input.budgetMin ?? null,
      budgetMax: input.budgetMax ?? null,
    },
  })

  if (keepIds !== undefined) {
    await prisma.$transaction([
      // Remove as fotos que não foram mantidas.
      keepIds.length > 0
        ? prisma.serviceRequestPhoto.deleteMany({
            where: { serviceRequestId: existing.id, id: { notIn: keepIds } },
          })
        : prisma.serviceRequestPhoto.deleteMany({ where: { serviceRequestId: existing.id } }),
      // Adiciona as novas.
      ...(newPhotoUrls.length > 0
        ? [
            prisma.serviceRequestPhoto.createMany({
              data: newPhotoUrls.map((url) => ({ serviceRequestId: existing.id, url })),
            }),
          ]
        : []),
    ])
  }

  const updated = await prisma.serviceRequest.findUniqueOrThrow({
    where: { id: existing.id },
    include: serviceRequestDetailInclude,
  })

  const reviewed = await hasReviewed(user.id, updated.serviceContracts[0]?.id)

  return context.json({ request: serializeServiceRequestDetail(updated, reviewed) })
}

// Exclusão da solicitação pelo cliente. Bloqueada quando já existe contrato
// (contratada/em andamento/concluída/cancelada) — a FK do contrato também
// impede a remoção. As propostas e fotos são removidas em cascata pelo banco.
export async function deleteServiceRequestHandler(context: AuthedContext) {
  const user = context.get("user")

  if (user.role !== "CLIENT") {
    return context.json(
      { code: "FORBIDDEN", message: "Apenas clientes podem excluir solicitações." },
      403,
    )
  }

  const id = context.req.param("id")

  if (!idSchema.safeParse(id).success) {
    return context.json({ code: "INVALID_ID", message: "Solicitação inválida." }, 400)
  }

  const existing = await prisma.serviceRequest.findFirst({
    where: { id, client: { userId: user.id } },
    select: { id: true, serviceContracts: { select: { id: true, status: true } } },
  })

  if (!existing) {
    return context.json({ code: "NOT_FOUND", message: "Solicitação não encontrada." }, 404)
  }

  // Bloqueia apenas solicitações efetivamente contratadas (contrato ativo ou
  // concluído). Contratos apenas cancelados ficam no histórico e não impedem a
  // exclusão.
  const hasActiveContract = existing.serviceContracts.some((c) => c.status !== "CANCELED")

  if (hasActiveContract) {
    return context.json(
      {
        code: "REQUEST_CONTRACTED",
        message: "Não é possível excluir uma solicitação contratada. Cancele o serviço primeiro.",
      },
      409,
    )
  }

  // Contratos cancelados precisam ser removidos antes (FK Restrict). Propostas e
  // fotos caem em cascata a partir da própria solicitação.
  if (existing.serviceContracts.length > 0) {
    await prisma.$transaction([
      prisma.serviceContract.deleteMany({ where: { serviceRequestId: existing.id } }),
      prisma.serviceRequest.delete({ where: { id: existing.id } }),
    ])
  } else {
    await prisma.serviceRequest.delete({ where: { id: existing.id } })
  }

  return context.json({ ok: true })
}

export async function serviceRequestsSummaryHandler(context: AuthedContext) {
  const user = context.get("user")
  const where = { client: { userId: user.id } }

  const [openRequests, completedServices, pendingProposals] = await Promise.all([
    prisma.serviceRequest.count({
      where: { ...where, status: { in: [...OPEN_STATUSES] } },
    }),
    prisma.serviceRequest.count({ where: { ...where, status: "COMPLETED" } }),
    prisma.proposal.count({
      where: { serviceRequest: where, status: "PENDING" },
    }),
  ])

  return context.json({ openRequests, pendingProposals, completedServices })
}
