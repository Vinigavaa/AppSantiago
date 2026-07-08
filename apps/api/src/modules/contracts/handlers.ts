import { prisma } from "@santiago/database"
import { z } from "zod"

import { sendPushToUser } from "@/modules/notifications/push"
import type { AuthedContext } from "@/modules/shared/require-auth"

const idSchema = z.uuid()

const cancelSchema = z.object({
  reason: z
    .string()
    .trim()
    .max(500, "O motivo pode ter no máximo 500 caracteres.")
    .optional(),
})

const noShowSchema = z.object({
  reason: z
    .string()
    .trim()
    .max(500, "O motivo pode ter no máximo 500 caracteres.")
    .optional(),
})

// Status do contrato em que ainda faz sentido cancelar.
const CANCELABLE = ["ACCEPTED", "IN_PROGRESS"] as const

// Cancelamento de serviço: tanto o cliente quanto o profissional do contrato
// podem cancelar enquanto não estiver concluído. Registra quem cancelou, o
// motivo e a data, e notifica a outra parte. Um serviço concluído ou já
// cancelado não pode mudar de estado.
export async function cancelContractHandler(context: AuthedContext) {
  const user = context.get("user")

  const id = context.req.param("id")
  if (!idSchema.safeParse(id).success) {
    return context.json({ code: "INVALID_ID", message: "Serviço inválido." }, 400)
  }

  const body = await context.req.json().catch(() => ({}))
  const parsed = cancelSchema.safeParse(body ?? {})
  if (!parsed.success) {
    return context.json(
      { code: "INVALID_DATA", message: parsed.error.issues[0]?.message ?? "Dados inválidos." },
      400,
    )
  }

  const contract = await prisma.serviceContract.findUnique({
    where: { id },
    select: {
      id: true,
      status: true,
      serviceRequestId: true,
      proposalId: true,
      client: { select: { userId: true } },
      professional: { select: { userId: true } },
    },
  })

  if (!contract) {
    return context.json({ code: "NOT_FOUND", message: "Serviço não encontrado." }, 404)
  }

  const isClient = contract.client.userId === user.id
  const isProfessional = contract.professional.userId === user.id

  if (!isClient && !isProfessional) {
    return context.json(
      { code: "FORBIDDEN", message: "Você não participa deste serviço." },
      403,
    )
  }

  if (!CANCELABLE.includes(contract.status as (typeof CANCELABLE)[number])) {
    return context.json(
      { code: "INVALID_TRANSITION", message: "Este serviço não pode mais ser cancelado." },
      409,
    )
  }

  const reason = parsed.data.reason

  // Cancelamento pelo profissional: ele desiste do serviço já contratado. A
  // solicitação volta a ficar ABERTA para receber novas propostas. O contrato é
  // mantido como CANCELADO (auditoria: quem/quando/motivo) para que o cliente
  // veja no histórico que o profissional desistiu; ele é ocultado das telas do
  // profissional. A proposta dele é marcada como cancelada — o que a exclui das
  // oportunidades e impede novo envio.
  if (isProfessional) {
    await prisma.$transaction([
      prisma.proposal.update({ where: { id: contract.proposalId }, data: { status: "CANCELED" } }),
      prisma.serviceContract.update({
        where: { id: contract.id },
        data: {
          status: "CANCELED",
          canceledAt: new Date(),
          canceledBy: user.id,
          cancelReason: reason ?? null,
        },
      }),
      prisma.serviceRequest.update({
        where: { id: contract.serviceRequestId },
        data: { status: "OPEN" },
      }),
      prisma.notification.create({
        data: {
          userId: contract.client.userId,
          type: "SERVICE_UPDATED",
          title: "Profissional cancelou o serviço",
          message: reason
            ? `O profissional cancelou o serviço. Sua solicitação voltou a ficar aberta para novas propostas. Motivo: ${reason}`
            : "O profissional cancelou o serviço. Sua solicitação voltou a ficar aberta para novas propostas.",
        },
      }),
    ])

    void sendPushToUser(
      contract.client.userId,
      "Profissional cancelou o serviço",
      "Sua solicitação voltou a ficar aberta para novas propostas.",
    )

    return context.json({ ok: true })
  }

  // Cancelamento pelo cliente: encerra o serviço. O contrato e a solicitação
  // ficam como CANCELADOS (mantidos para histórico), a proposta também é marcada
  // como cancelada (sai da aba "Aceitas" e vira histórico) e o profissional é avisado.
  await prisma.$transaction([
    prisma.serviceContract.update({
      where: { id: contract.id },
      data: {
        status: "CANCELED",
        canceledAt: new Date(),
        canceledBy: user.id,
        cancelReason: reason ?? null,
      },
    }),
    prisma.proposal.update({ where: { id: contract.proposalId }, data: { status: "CANCELED" } }),
    prisma.serviceRequest.update({
      where: { id: contract.serviceRequestId },
      data: { status: "CANCELED" },
    }),
    prisma.notification.create({
      data: {
        userId: contract.professional.userId,
        type: "SERVICE_UPDATED",
        title: "Serviço cancelado",
        message: reason
          ? `O cliente cancelou o serviço. Motivo: ${reason}`
          : "O cliente cancelou o serviço.",
      },
    }),
  ])

  void sendPushToUser(
    contract.professional.userId,
    "Serviço cancelado",
    reason ? `O cliente cancelou o serviço. Motivo: ${reason}` : "O cliente cancelou o serviço.",
  )

  return context.json({ ok: true })
}

// Cliente reporta que o profissional não compareceu. A contratação atual é
// cancelada (mantida para auditoria: quem, quando e por quê), a proposta do
// faltante é cancelada e a solicitação volta a ficar ABERTA — visível aos
// profissionais compatíveis e apta a receber novas propostas. Fotos, descrição,
// endereço e histórico são preservados. Ambas as partes são notificadas.
export async function reportNoShowHandler(context: AuthedContext) {
  const user = context.get("user")

  if (user.role !== "CLIENT") {
    return context.json(
      { code: "FORBIDDEN", message: "Apenas o cliente pode reportar não comparecimento." },
      403,
    )
  }

  const id = context.req.param("id")
  if (!idSchema.safeParse(id).success) {
    return context.json({ code: "INVALID_ID", message: "Serviço inválido." }, 400)
  }

  const body = await context.req.json().catch(() => ({}))
  const parsed = noShowSchema.safeParse(body ?? {})
  if (!parsed.success) {
    return context.json(
      { code: "INVALID_DATA", message: parsed.error.issues[0]?.message ?? "Dados inválidos." },
      400,
    )
  }

  const contract = await prisma.serviceContract.findUnique({
    where: { id },
    select: {
      id: true,
      status: true,
      serviceRequestId: true,
      proposalId: true,
      client: { select: { userId: true } },
      professional: { select: { userId: true } },
    },
  })

  if (!contract) {
    return context.json({ code: "NOT_FOUND", message: "Serviço não encontrado." }, 404)
  }

  if (contract.client.userId !== user.id) {
    return context.json({ code: "FORBIDDEN", message: "Você não participa deste serviço." }, 403)
  }

  if (!CANCELABLE.includes(contract.status as (typeof CANCELABLE)[number])) {
    return context.json(
      { code: "INVALID_TRANSITION", message: "Este serviço não pode mais ser cancelado." },
      409,
    )
  }

  const reason = parsed.data.reason || "Profissional não compareceu no horário combinado."

  await prisma.$transaction([
    prisma.serviceContract.update({
      where: { id: contract.id },
      data: {
        status: "CANCELED",
        canceledAt: new Date(),
        canceledBy: user.id,
        cancelReason: reason,
      },
    }),
    // A proposta do faltante sai do ar: não reaparece nas oportunidades dele nem
    // permite reenvio (índice único por solicitação/profissional).
    prisma.proposal.update({ where: { id: contract.proposalId }, data: { status: "CANCELED" } }),
    prisma.serviceRequest.update({
      where: { id: contract.serviceRequestId },
      data: { status: "OPEN" },
    }),
    prisma.notification.create({
      data: {
        userId: contract.professional.userId,
        type: "SERVICE_UPDATED",
        title: "Contratação cancelada",
        message: `A contratação foi cancelada por não comparecimento. Motivo: ${reason}`,
      },
    }),
    prisma.notification.create({
      data: {
        userId: user.id,
        type: "SERVICE_UPDATED",
        title: "Solicitação reaberta",
        message: "Sua solicitação voltou a receber propostas de outros profissionais.",
      },
    }),
  ])

  void sendPushToUser(
    contract.professional.userId,
    "Contratação cancelada",
    `A contratação foi cancelada por não comparecimento. Motivo: ${reason}`,
  )

  return context.json({ ok: true })
}
