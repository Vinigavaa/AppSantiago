import { prisma } from "@santiago/database"
import { z } from "zod"

import type { AuthedContext } from "@/modules/shared/require-auth"

const idSchema = z.uuid()

// Mostra apenas o primeiro nome do avaliador — preserva a privacidade do cliente
// nas avaliações públicas.
function firstName(name: string): string {
  return name.trim().split(/\s+/)[0] ?? name
}

// Perfil público de um profissional, exibido ao cliente antes de decidir uma
// contratação. Traz identidade, reputação, atuação e avaliações — nunca dados de
// contato (e-mail/telefone), que só são liberados após a contratação.
export async function publicProfessionalProfileHandler(context: AuthedContext) {
  const id = context.req.param("id")

  if (!idSchema.safeParse(id).success) {
    return context.json({ code: "INVALID_ID", message: "Profissional inválido." }, 400)
  }

  const profile = await prisma.professionalProfile.findUnique({
    where: { id },
    select: {
      id: true,
      bio: true,
      ratingAverage: true,
      ratingCount: true,
      user: { select: { id: true, name: true, displayUsername: true, avatarUrl: true } },
      categories: {
        select: { category: { select: { id: true, name: true } } },
        orderBy: { createdAt: "asc" },
      },
      cities: {
        select: { city: { select: { id: true, name: true, state: true } } },
        orderBy: { createdAt: "asc" },
      },
    },
  })

  if (!profile) {
    return context.json({ code: "NOT_FOUND", message: "Profissional não encontrado." }, 404)
  }

  const [servicesCompleted, reviews] = await Promise.all([
    prisma.serviceContract.count({ where: { professionalId: profile.id, status: "COMPLETED" } }),
    prisma.review.findMany({
      where: { reviewedId: profile.user.id },
      select: {
        id: true,
        rating: true,
        comment: true,
        createdAt: true,
        reviewer: { select: { name: true, displayUsername: true } },
        serviceContract: {
          select: { serviceRequest: { select: { category: { select: { name: true } } } } },
        },
      },
      orderBy: { createdAt: "desc" },
      take: 30,
    }),
  ])

  const categories = profile.categories.map((item) => item.category)
  const cities = profile.cities.map((item) => item.city)

  return context.json({
    professional: {
      id: profile.id,
      // userId identifica a pessoa para iniciar uma conversa (botão "Conversar").
      userId: profile.user.id,
      name: profile.user.displayUsername ?? profile.user.name,
      avatarUrl: profile.user.avatarUrl,
      bio: profile.bio,
      mainCategory: categories[0]?.name ?? null,
      categories,
      cities,
      ratingAverage: Number(profile.ratingAverage),
      ratingCount: profile.ratingCount,
      stats: { servicesCompleted },
      reviews: reviews.map((review) => ({
        id: review.id,
        rating: review.rating,
        comment: review.comment,
        createdAt: review.createdAt.toISOString(),
        reviewerName: firstName(review.reviewer.displayUsername ?? review.reviewer.name),
        serviceCategory: review.serviceContract.serviceRequest.category.name,
      })),
    },
  })
}
