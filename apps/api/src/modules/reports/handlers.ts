import { prisma } from "@santiago/database"
import { z } from "zod"

import { sendReportNotificationEmail } from "@/services/email-service"
import type { AuthedContext } from "@/modules/shared/require-auth"

import { resolveReportTarget } from "./service"

// Limite de denúncias por usuário numa janela. Uma pessoa de boa-fé não denuncia
// dezenas de itens por hora; o teto evita uso da denúncia como flood.
const MAX_REPORTS_PER_WINDOW = 15
const REPORT_WINDOW_MS = 60 * 60 * 1000

const reportSchema = z
  .object({
    targetType: z.enum(["USER", "MESSAGE", "REVIEW", "SERVICE_REQUEST", "PORTFOLIO_ITEM"]),
    targetId: z.uuid("Conteúdo inválido."),
    reason: z.enum([
      "SPAM",
      "ASSEDIO",
      "CONTEUDO_SEXUAL",
      "VIOLENCIA",
      "DISCURSO_DE_ODIO",
      "GOLPE",
      "OUTRO",
    ]),
    details: z.string().trim().max(500, "O detalhe deve ter no máximo 500 caracteres.").optional(),
  })
  // Em "Outro" o motivo não diz nada por si só: sem descrição o operador não tem
  // como analisar o caso dentro do prazo.
  .refine((data) => data.reason !== "OUTRO" || (data.details?.length ?? 0) >= 10, {
    message: "Descreva o problema com pelo menos 10 caracteres.",
    path: ["details"],
  })

// Registra uma denúncia. Idempotente: denunciar o mesmo alvo de novo mantém o
// registro original e responde sucesso — o denunciante não precisa saber que já
// tinha denunciado, e a moderação não recebe o caso duplicado.
export async function createReportHandler(context: AuthedContext) {
  const user = context.get("user")

  const body = await context.req.json().catch(() => null)
  const parsed = reportSchema.safeParse(body)

  if (!parsed.success) {
    return context.json(
      { code: "INVALID_DATA", message: parsed.error.issues[0]?.message ?? "Dados inválidos." },
      400,
    )
  }

  const { targetType, targetId, reason } = parsed.data
  const details = parsed.data.details?.trim() || null

  if (targetType === "USER" && targetId === user.id) {
    return context.json(
      { code: "INVALID_DATA", message: "Você não pode denunciar a si mesmo." },
      400,
    )
  }

  const target = await resolveReportTarget(targetType, targetId)

  if (!target) {
    return context.json({ code: "NOT_FOUND", message: "Conteúdo não encontrado." }, 404)
  }

  if (target.authorUserId === user.id) {
    return context.json(
      { code: "INVALID_DATA", message: "Você não pode denunciar o próprio conteúdo." },
      400,
    )
  }

  const recentReports = await prisma.contentReport.count({
    where: { reporterId: user.id, createdAt: { gte: new Date(Date.now() - REPORT_WINDOW_MS) } },
  })

  if (recentReports >= MAX_REPORTS_PER_WINDOW) {
    return context.json(
      {
        code: "RATE_LIMITED",
        message: "Você fez muitas denúncias em pouco tempo. Tente novamente mais tarde.",
      },
      429,
    )
  }

  const existing = await prisma.contentReport.findUnique({
    where: { reporterId_targetType_targetId: { reporterId: user.id, targetType, targetId } },
    select: { id: true },
  })

  if (existing) {
    return context.json({ reported: true }, 201)
  }

  const report = await prisma.contentReport.create({
    data: { reporterId: user.id, targetType, targetId, reason, details },
    select: { id: true, createdAt: true },
  })

  // O aviso é só o gatilho de atenção da moderação: se o envio falhar, a denúncia
  // continua registrada e aparece em `npm run moderate -- list`.
  await sendReportNotificationEmail({
    reportId: report.id,
    targetType,
    targetId,
    targetSummary: target.summary,
    authorUserId: target.authorUserId,
    reason,
    details,
    reporterId: user.id,
    reporterEmail: user.email,
  }).catch((error) => {
    console.error(
      `[moderation] falha ao avisar a moderação sobre a denúncia ${report.id}:`,
      error instanceof Error ? error.message : error,
    )
  })

  return context.json({ reported: true }, 201)
}
