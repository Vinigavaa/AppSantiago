import { prisma } from "@santiago/database"
import { Prisma } from "@prisma/client"

import { sendPushToUser } from "@/modules/notifications/push"
import type { AuthedContext } from "@/modules/shared/require-auth"

import { createReviewSchema } from "./schemas"

// Cliente avalia o profissional após o serviço concluído. A reputação do
// profissional (nota média + total) é recalculada na mesma transação.
export async function createReviewHandler(context: AuthedContext) {
  const user = context.get("user")

  if (user.role !== "CLIENT") {
    return context.json(
      { code: "FORBIDDEN", message: "Apenas clientes podem avaliar." },
      403,
    )
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
      professionalId: true,
      client: { select: { userId: true } },
      professional: { select: { userId: true } },
    },
  })

  if (!contract) {
    return context.json({ code: "NOT_FOUND", message: "Serviço não encontrado." }, 404)
  }

  // Só o cliente dono do contrato pode avaliar.
  if (contract.client.userId !== user.id) {
    return context.json(
      { code: "FORBIDDEN", message: "Você não pode avaliar este serviço." },
      403,
    )
  }

  // Avaliação só após a conclusão do serviço.
  if (contract.status !== "COMPLETED") {
    return context.json(
      { code: "NOT_COMPLETED", message: "Só é possível avaliar serviços concluídos." },
      409,
    )
  }

  const reviewedId = contract.professional.userId

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

      // Recalcula a reputação do profissional a partir de todas as avaliações.
      const stats = await tx.review.aggregate({
        where: { reviewedId },
        _avg: { rating: true },
        _count: { rating: true },
      })

      await tx.professionalProfile.update({
        where: { id: contract.professionalId },
        data: {
          ratingAverage: stats._avg.rating ?? 0,
          ratingCount: stats._count.rating,
        },
      })

      await tx.notification.create({
        data: {
          userId: reviewedId,
          type: "REVIEW_RECEIVED",
          title: "Você recebeu uma avaliação",
          message: "Um cliente avaliou o serviço que você realizou.",
        },
      })
    })
  } catch (error) {
    // Índice único impede avaliação duplicada do mesmo contrato.
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
    "Um cliente avaliou o serviço que você realizou.",
  )

  return context.json({ ok: true }, 201)
}
