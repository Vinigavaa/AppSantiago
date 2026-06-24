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

  // Notifica a contraparte; a mensagem indica quem cancelou.
  const otherUserId = isClient ? contract.professional.userId : contract.client.userId
  const byLabel = isClient ? "O cliente" : "O profissional"
  const reason = parsed.data.reason

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
    prisma.serviceRequest.update({
      where: { id: contract.serviceRequestId },
      data: { status: "CANCELED" },
    }),
    prisma.notification.create({
      data: {
        userId: otherUserId,
        type: "SERVICE_UPDATED",
        title: "Serviço cancelado",
        message: reason
          ? `${byLabel} cancelou o serviço. Motivo: ${reason}`
          : `${byLabel} cancelou o serviço.`,
      },
    }),
  ])

  void sendPushToUser(
    otherUserId,
    "Serviço cancelado",
    reason ? `${byLabel} cancelou o serviço. Motivo: ${reason}` : `${byLabel} cancelou o serviço.`,
  )

  return context.json({ ok: true })
}
