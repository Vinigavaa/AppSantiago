import { prisma } from "@santiago/database"

import type { AuthedContext } from "@/modules/shared/require-auth"

import { getOrCreateClientProfileId } from "./client-profile"
import { createServiceRequestSchema } from "./schemas"
import { serializeServiceRequest, serviceRequestInclude } from "./serialize"

// Solicitações consideradas "em aberto" no resumo do cliente.
const OPEN_STATUSES = ["OPEN", "IN_NEGOTIATION"] as const

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

  const created = await prisma.serviceRequest.create({
    data: {
      clientId,
      categoryId: input.categoryId,
      cityId: input.cityId,
      title: input.title,
      description: input.description,
      urgency: input.urgency,
      addressNeighborhood: input.neighborhood ?? null,
      budgetMin: input.budgetMin ?? null,
      budgetMax: input.budgetMax ?? null,
    },
    include: serviceRequestInclude,
  })

  return context.json({ request: serializeServiceRequest(created) }, 201)
}

export async function listServiceRequestsHandler(context: AuthedContext) {
  const user = context.get("user")

  const requests = await prisma.serviceRequest.findMany({
    where: { client: { userId: user.id } },
    include: serviceRequestInclude,
    orderBy: { createdAt: "desc" },
  })

  return context.json({ requests: requests.map(serializeServiceRequest) })
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
