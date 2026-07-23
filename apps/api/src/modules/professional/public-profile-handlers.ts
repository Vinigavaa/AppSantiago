import { prisma } from "@santiago/database"
import { z } from "zod"

import { blockStateBetween } from "@/modules/blocks/service"
import type { AuthedContext } from "@/modules/shared/require-auth"
import { getEntitlementByProfessionalId } from "@/modules/subscriptions/entitlement"

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
  const user = context.get("user")
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
      portfolioItems: {
        select: { id: true, title: true, description: true, imageUrl: true },
        orderBy: { createdAt: "desc" },
      },
    },
  })

  if (!profile) {
    return context.json({ code: "NOT_FOUND", message: "Profissional não encontrado." }, 404)
  }

  const block = await blockStateBetween(user.id, profile.user.id)

  // Se o profissional bloqueou este cliente, o perfil some para ele (como se não
  // existisse). Se o cliente bloqueou o profissional, o perfil ainda é exibido —
  // com o estado `block.byMe` a UI mostra "Desbloquear" no lugar de "Conversar".
  if (block.byThem) {
    return context.json({ code: "NOT_FOUND", message: "Perfil indisponível." }, 404)
  }

  const [servicesCompleted, reviews, entitlement] = await Promise.all([
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
    getEntitlementByProfessionalId(profile.id),
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
      // Selo de destaque: assinante ativo. Decidido no servidor.
      isFeatured: entitlement.isActive,
      // byMe habilita "Desbloquear"; byThem nunca chega aqui (perfil 404 acima).
      blockedByMe: block.byMe,
      portfolio: profile.portfolioItems,
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
