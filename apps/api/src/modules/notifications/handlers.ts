import { prisma } from "@santiago/database"
import type { Prisma } from "@prisma/client"
import { z } from "zod"

import type { AuthedContext } from "@/modules/shared/require-auth"

const registerPushTokenSchema = z.object({
  token: z.string().trim().min(1, "Token inválido.").max(255),
  platform: z.string().trim().max(20).optional(),
})

// Quantidade máxima retornada na central. Suficiente para o MVP; evita payloads
// grandes. Notificações antigas continuam no banco para auditoria.
const MAX_NOTIFICATIONS = 50

function serializeNotification(
  notification: Pick<
    Prisma.NotificationGetPayload<true>,
    "id" | "title" | "message" | "type" | "readAt" | "createdAt"
  >,
) {
  return {
    id: notification.id,
    title: notification.title,
    message: notification.message,
    type: notification.type,
    read: notification.readAt !== null,
    createdAt: notification.createdAt.toISOString(),
  }
}

// Central de notificações do usuário autenticado (cliente ou profissional).
export async function listNotificationsHandler(context: AuthedContext) {
  const user = context.get("user")

  const [notifications, unreadCount] = await Promise.all([
    prisma.notification.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: "desc" },
      take: MAX_NOTIFICATIONS,
      select: {
        id: true,
        title: true,
        message: true,
        type: true,
        readAt: true,
        createdAt: true,
      },
    }),
    prisma.notification.count({ where: { userId: user.id, readAt: null } }),
  ])

  return context.json({ notifications: notifications.map(serializeNotification), unreadCount })
}

// Marca todas as notificações não lidas do usuário como lidas (ao abrir a tela).
export async function markNotificationsReadHandler(context: AuthedContext) {
  const user = context.get("user")

  await prisma.notification.updateMany({
    where: { userId: user.id, readAt: null },
    data: { readAt: new Date() },
  })

  return context.json({ ok: true })
}

// Registra (ou atualiza) o token de push do dispositivo do usuário. O token é
// único: se já existia em outra conta, passa a pertencer a quem registrou agora.
export async function registerPushTokenHandler(context: AuthedContext) {
  const user = context.get("user")

  const body = await context.req.json().catch(() => null)
  const parsed = registerPushTokenSchema.safeParse(body)

  if (!parsed.success) {
    return context.json(
      { code: "INVALID_DATA", message: parsed.error.issues[0]?.message ?? "Dados inválidos." },
      400,
    )
  }

  await prisma.devicePushToken.upsert({
    where: { token: parsed.data.token },
    create: { userId: user.id, token: parsed.data.token, platform: parsed.data.platform ?? null },
    update: { userId: user.id, platform: parsed.data.platform ?? null },
  })

  return context.json({ ok: true })
}
