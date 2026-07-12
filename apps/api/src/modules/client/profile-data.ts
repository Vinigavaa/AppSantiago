import { prisma } from "@santiago/database"

import type { AuthenticatedUser } from "@/modules/shared/require-auth"

type RatingKey = "1" | "2" | "3" | "4" | "5"

// Monta o payload completo do perfil do cliente. Reutilizado pela leitura (GET)
// e após cada alteração (PATCH), garantindo dados sempre frescos.
export async function getClientProfilePayload(user: AuthenticatedUser) {
  const [account, profile] = await Promise.all([
    prisma.user.findUnique({
      where: { id: user.id },
      select: {
        name: true,
        email: true,
        phone: true,
        username: true,
        displayUsername: true,
        avatarUrl: true,
        createdAt: true,
      },
    }),
    prisma.clientProfile.findUnique({
      where: { userId: user.id },
      select: { id: true, ratingAverage: true, ratingCount: true },
    }),
  ])

  const clientId = profile?.id ?? null

  // Cidade principal: a da solicitação mais recente do cliente. É um dado real
  // (não há endereço fixo no perfil) e reflete a região onde ele mais atua.
  const [latestRequest, requestsCreated, servicesCompleted, hiredContracts, distributionRows] =
    await Promise.all([
      clientId
        ? prisma.serviceRequest.findFirst({
            where: { clientId },
            orderBy: { createdAt: "desc" },
            select: { city: { select: { name: true, state: true } } },
          })
        : null,
      clientId ? prisma.serviceRequest.count({ where: { clientId } }) : 0,
      clientId
        ? prisma.serviceContract.count({ where: { clientId, status: "COMPLETED" } })
        : 0,
      // Profissionais distintos já contratados (qualquer contrato firmado conta).
      clientId
        ? prisma.serviceContract.findMany({
            where: { clientId },
            distinct: ["professionalId"],
            select: { professionalId: true },
          })
        : [],
      prisma.review.groupBy({
        by: ["rating"],
        where: { reviewedId: user.id },
        _count: { _all: true },
      }),
    ])

  const ratingDistribution: Record<RatingKey, number> = {
    "1": 0,
    "2": 0,
    "3": 0,
    "4": 0,
    "5": 0,
  }

  for (const row of distributionRows) {
    const key = String(row.rating) as RatingKey
    if (key in ratingDistribution) {
      ratingDistribution[key] = row._count._all
    }
  }

  const mainCity = latestRequest
    ? { name: latestRequest.city.name, state: latestRequest.city.state }
    : null

  return {
    name: account?.name ?? user.name,
    username: account?.displayUsername ?? account?.username ?? null,
    email: account?.email ?? user.email,
    phone: account?.phone ?? null,
    avatarUrl: account?.avatarUrl ?? null,
    memberSince: (account?.createdAt ?? new Date()).toISOString(),
    mainCity,
    ratingAverage: Number(profile?.ratingAverage ?? 0),
    ratingCount: profile?.ratingCount ?? 0,
    ratingDistribution,
    stats: {
      requestsCreated,
      servicesCompleted,
      professionalsHired: hiredContracts.length,
    },
  }
}
