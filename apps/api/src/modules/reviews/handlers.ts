import { prisma } from "@santiago/database"
import { Prisma } from "@prisma/client"

import { sendPushToUser } from "@/modules/notifications/push"
import type { AuthedContext } from "@/modules/shared/require-auth"

import { createReviewSchema } from "./schemas"

// Avaliação após o serviço concluído. Funciona nos dois sentidos: o cliente
// avalia o profissional e o profissional avalia o cliente. A reputação do
// avaliado (nota média + total) é recalculada na mesma transação.
export async function createReviewHandler(context: AuthedContext) {
  const user = context.get("user")

  if (user.role !== "CLIENT" && user.role !== "PROFESSIONAL") {
    return context.json({ code: "FORBIDDEN", message: "Perfil não pode avaliar." }, 403)
  }

  const body = await context.req.json().catch(() => null)
  const parsed = createReviewSchema.safeParse(body)

  if (!parsed.success) {
    return context.json(
      { code: "INVALID_DATA", message: parsed.error.issues[0]?.message ?? "Dados inválidos." },
      400,
    )
  }

  const input = parsed.data

  const contract = await prisma.serviceContract.findUnique({
    where: { id: input.serviceContractId },
    select: {
      id: true,
      status: true,
      clientId: true,
      professionalId: true,
      client: { select: { userId: true } },
      professional: { select: { userId: true } },
    },
  })

  if (!contract) {
    return context.json({ code: "NOT_FOUND", message: "Serviço não encontrado." }, 404)
  }

  // Define o sentido da avaliação a partir do papel de quem avalia, validando que
  // ele é realmente parte do contrato.
  const isClient = user.role === "CLIENT" && contract.client.userId === user.id
  const isProfessional = user.role === "PROFESSIONAL" && contract.professional.userId === user.id

  if (!isClient && !isProfessional) {
    return context.json(
      { code: "FORBIDDEN", message: "Você não pode avaliar este serviço." },
      403,
    )
  }

  // Avaliação só após a conclusão do serviço (nunca cancelado ou em andamento).
  if (contract.status !== "COMPLETED") {
    return context.json(
      { code: "NOT_COMPLETED", message: "Só é possível avaliar serviços concluídos." },
      409,
    )
  }

  const reviewedId = isClient ? contract.professional.userId : contract.client.userId

  try {
    await prisma.$transaction(async (tx) => {
      await tx.review.create({
        data: {
          serviceContractId: contract.id,
          reviewerId: user.id,
          reviewedId,
          rating: input.rating,
          comment: input.comment ?? null,
        },
      })

      // Recalcula a reputação do avaliado a partir de todas as avaliações
      // recebidas por ele, e grava no perfil correspondente.
      const stats = await tx.review.aggregate({
        where: { reviewedId },
        _avg: { rating: true },
        _count: { rating: true },
      })

      if (isClient) {
        await tx.professionalProfile.update({
          where: { id: contract.professionalId },
          data: { ratingAverage: stats._avg.rating ?? 0, ratingCount: stats._count.rating },
        })
      } else {
        await tx.clientProfile.update({
          where: { id: contract.clientId },
          data: { ratingAverage: stats._avg.rating ?? 0, ratingCount: stats._count.rating },
        })
      }

      await tx.notification.create({
        data: {
          userId: reviewedId,
          type: "REVIEW_RECEIVED",
          title: "Você recebeu uma avaliação",
          message: isClient
            ? "Um cliente avaliou o serviço que você realizou."
            : "Um profissional avaliou você como cliente.",
        },
      })
    })
  } catch (error) {
    // Índice único impede avaliação duplicada do mesmo contrato pelo mesmo autor.
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      return context.json(
        { code: "ALREADY_REVIEWED", message: "Você já avaliou este serviço." },
        409,
      )
    }
    throw error
  }

  void sendPushToUser(
    reviewedId,
    "Você recebeu uma avaliação",
    isClient
      ? "Um cliente avaliou o serviço que você realizou."
      : "Um profissional avaliou você como cliente.",
  )

  return context.json({ ok: true }, 201)
}
