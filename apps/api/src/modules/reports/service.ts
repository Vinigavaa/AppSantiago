import { prisma } from "@santiago/database"
import type { ReportTargetType } from "@prisma/client"

// Alvo de denúncia já resolvido: quem escreveu o conteúdo e um resumo curto para o
// operador entender o caso sem abrir o banco.
export type ResolvedTarget = {
  authorUserId: string
  summary: string
}

function trim(text: string | null | undefined, limit = 160): string {
  const value = (text ?? "").trim()

  if (!value) {
    return "(sem texto)"
  }

  return value.length > limit ? `${value.slice(0, limit)}…` : value
}

// Resolve o alvo de uma denúncia: existe? quem é o autor? O par (tipo, id) não tem
// relação forte no banco — este `switch` é o único lugar que sabe traduzir cada
// tipo para a tabela correspondente. É usado tanto pelo handler (para validar antes
// de gravar) quanto pela ferramenta de moderação (para mostrar o conteúdo).
export async function resolveReportTarget(
  targetType: ReportTargetType,
  targetId: string,
): Promise<ResolvedTarget | null> {
  switch (targetType) {
    case "USER": {
      const user = await prisma.user.findUnique({
        where: { id: targetId },
        select: { id: true, name: true, email: true },
      })

      return user ? { authorUserId: user.id, summary: `${user.name} <${user.email}>` } : null
    }

    case "MESSAGE": {
      const message = await prisma.message.findUnique({
        where: { id: targetId },
        select: { senderId: true, content: true, attachmentUrl: true },
      })

      if (!message) {
        return null
      }

      const attachment = message.attachmentUrl ? ` [anexo: ${message.attachmentUrl}]` : ""

      return { authorUserId: message.senderId, summary: `${trim(message.content)}${attachment}` }
    }

    case "REVIEW": {
      const review = await prisma.review.findUnique({
        where: { id: targetId },
        select: { reviewerId: true, rating: true, comment: true },
      })

      return review
        ? {
            authorUserId: review.reviewerId,
            summary: `${review.rating}★ — ${trim(review.comment)}`,
          }
        : null
    }

    case "SERVICE_REQUEST": {
      const request = await prisma.serviceRequest.findUnique({
        where: { id: targetId },
        select: { title: true, description: true, client: { select: { userId: true } } },
      })

      return request
        ? {
            authorUserId: request.client.userId,
            summary: `${request.title} — ${trim(request.description)}`,
          }
        : null
    }

    case "PORTFOLIO_ITEM": {
      const item = await prisma.professionalPortfolioItem.findUnique({
        where: { id: targetId },
        select: {
          title: true,
          description: true,
          imageUrl: true,
          professional: { select: { userId: true } },
        },
      })

      return item
        ? {
            authorUserId: item.professional.userId,
            summary: `${item.title} — ${trim(item.description)} [${item.imageUrl}]`,
          }
        : null
    }
  }
}
