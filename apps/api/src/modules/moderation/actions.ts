import { prisma } from "@santiago/database"
import type { ReportTargetType } from "@prisma/client"

// Ações de moderação. Ficam isoladas aqui, sem depender de HTTP: hoje quem chama é
// a ferramenta de linha de comando (`npm run moderate`); se um dia o volume pedir
// um painel, o mesmo módulo é exposto por rota sem reescrita.

export type ActionResult = { ok: true; message: string } | { ok: false; message: string }

// Oculta o conteúdo denunciado. Nunca apaga: o registro é preservado para
// auditoria e some de todas as leituras da API.
export async function hideContent(
  targetType: ReportTargetType,
  targetId: string,
  reason: string,
): Promise<ActionResult> {
  const data = { hiddenAt: new Date(), hiddenReason: reason }

  switch (targetType) {
    case "USER":
      return {
        ok: false,
        message: "Usuário não é conteúdo: use `suspend <userId>` para barrar o acesso.",
      }

    case "MESSAGE": {
      const updated = await prisma.message.updateMany({ where: { id: targetId }, data })
      return result(updated.count, "Mensagem ocultada.", "Mensagem não encontrada.")
    }

    case "REVIEW": {
      const review = await prisma.review.findUnique({
        where: { id: targetId },
        select: { reviewedId: true },
      })

      if (!review) {
        return { ok: false, message: "Avaliação não encontrada." }
      }

      await prisma.review.update({ where: { id: targetId }, data })
      await recalculateReputation(review.reviewedId)

      return { ok: true, message: "Avaliação ocultada e reputação recalculada." }
    }

    case "SERVICE_REQUEST": {
      const updated = await prisma.serviceRequest.updateMany({ where: { id: targetId }, data })
      return result(updated.count, "Solicitação ocultada.", "Solicitação não encontrada.")
    }

    case "PORTFOLIO_ITEM": {
      const updated = await prisma.professionalPortfolioItem.updateMany({
        where: { id: targetId },
        data,
      })
      return result(updated.count, "Item de portfólio ocultado.", "Item não encontrado.")
    }
  }
}

function result(count: number, success: string, notFound: string): ActionResult {
  return count > 0 ? { ok: true, message: success } : { ok: false, message: notFound }
}

// Recalcula nota média e total do avaliado ignorando as avaliações ocultas — os
// mesmos números que os handlers de perfil exibem.
async function recalculateReputation(reviewedUserId: string) {
  const stats = await prisma.review.aggregate({
    where: { reviewedId: reviewedUserId, hiddenAt: null },
    _avg: { rating: true },
    _count: { rating: true },
  })

  const rating = stats._avg.rating ?? 0
  const total = stats._count.rating

  await prisma.professionalProfile.updateMany({
    where: { userId: reviewedUserId },
    data: { ratingAverage: rating, ratingCount: total },
  })

  await prisma.clientProfile.updateMany({
    where: { userId: reviewedUserId },
    data: { ratingAverage: rating, ratingCount: total },
  })
}

// Suspende o usuário: perde o acesso ao app (403 em toda rota autenticada) e some
// das listagens públicas. Reversível por `unsuspendUser`.
export async function suspendUser(userId: string, reason: string): Promise<ActionResult> {
  const updated = await prisma.user.updateMany({
    where: { id: userId },
    data: { suspendedAt: new Date(), suspendedReason: reason },
  })

  return result(updated.count, "Usuário suspenso.", "Usuário não encontrado.")
}

export async function unsuspendUser(userId: string): Promise<ActionResult> {
  const updated = await prisma.user.updateMany({
    where: { id: userId },
    data: { suspendedAt: null, suspendedReason: null },
  })

  return result(updated.count, "Usuário reativado.", "Usuário não encontrado.")
}

// Fecha a denúncia. Só decide caso pendente: decidir de novo apagaria a decisão
// anterior e a data que comprova o cumprimento do prazo de 24h.
async function decideReport(
  reportId: string,
  status: "RESOLVED" | "DISMISSED",
  note: string,
): Promise<ActionResult> {
  const report = await prisma.contentReport.findUnique({
    where: { id: reportId },
    select: { status: true },
  })

  if (!report) {
    return { ok: false, message: "Denúncia não encontrada." }
  }

  if (report.status !== "PENDING") {
    return { ok: false, message: `Esta denúncia já foi decidida (${report.status}).` }
  }

  await prisma.contentReport.update({
    where: { id: reportId },
    data: { status, resolvedAt: new Date(), resolutionNote: note },
  })

  return { ok: true, message: status === "RESOLVED" ? "Denúncia resolvida." : "Denúncia descartada." }
}

export function resolveReport(reportId: string, note: string) {
  return decideReport(reportId, "RESOLVED", note)
}

export function dismissReport(reportId: string, note: string) {
  return decideReport(reportId, "DISMISSED", note)
}
