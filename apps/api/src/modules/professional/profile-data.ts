import { prisma } from "@santiago/database"

import type { AuthenticatedUser } from "@/modules/shared/require-auth"

type RatingKey = "1" | "2" | "3" | "4" | "5"

// Monta o payload completo do perfil profissional. Reutilizado pela leitura
// (GET) e após cada alteração (PATCH/PUT), garantindo dados sempre frescos.
export async function getProfessionalProfilePayload(user: AuthenticatedUser) {
  const [account, profile] = await Promise.all([
    prisma.user.findUnique({
      where: { id: user.id },
      select: { name: true, email: true, phone: true, displayUsername: true, avatarUrl: true },
    }),
    prisma.professionalProfile.findUnique({
      where: { userId: user.id },
      select: {
        id: true,
        bio: true,
        ratingAverage: true,
        ratingCount: true,
        categories: {
          select: { category: { select: { id: true, name: true } } },
          orderBy: { createdAt: "asc" },
        },
        cities: {
          select: { city: { select: { id: true, name: true, state: true } } },
          orderBy: { createdAt: "asc" },
        },
      },
    }),
  ])

  const professionalId = profile?.id ?? null

  const [servicesCompleted, proposalsSent, acceptedProposals, distributionRows] =
    await Promise.all([
      professionalId
        ? prisma.serviceContract.count({ where: { professionalId, status: "COMPLETED" } })
        : 0,
      professionalId ? prisma.proposal.count({ where: { professionalId } }) : 0,
      professionalId
        ? prisma.proposal.count({ where: { professionalId, status: "ACCEPTED" } })
        : 0,
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

  const categories = (profile?.categories ?? []).map((item) => item.category)
  const cities = (profile?.cities ?? []).map((item) => item.city)
  const hireRate = proposalsSent > 0 ? acceptedProposals / proposalsSent : 0

  return {
    name: account?.name ?? user.name,
    displayName: account?.displayUsername ?? null,
    email: account?.email ?? user.email,
    phone: account?.phone ?? null,
    bio: profile?.bio ?? null,
    avatarUrl: account?.avatarUrl ?? null,
    mainCategory: categories[0]?.name ?? null,
    categories,
    cities,
    ratingAverage: Number(profile?.ratingAverage ?? 0),
    ratingCount: profile?.ratingCount ?? 0,
    ratingDistribution,
    stats: { servicesCompleted, proposalsSent, hireRate },
  }
}
