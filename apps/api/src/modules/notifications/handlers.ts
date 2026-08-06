import { prisma } from "@santiago/database"
import type { Prisma } from "@prisma/client"
import { z } from "zod"

import { countUnreadMessages } from "@/modules/chat/unread"
import type { AuthedContext } from "@/modules/shared/require-auth"

import {
  ALERT_TYPES,
  BADGE_AREAS,
  areaForNotification,
  isBadgeArea,
  notificationTypesForArea,
  type BadgeArea,
} from "./areas"

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

// Quantidade máxima de avisos devolvidos por ciclo. O que passar disso continua
// no indicador da aba, que é o canal persistente.
const MAX_PENDING_ALERTS = 5

// Contagem de pendências por área da navegação inferior, mais os eventos que
// merecem um aviso imediato no app.
//
// Deixou de ser a fonte primária: o app atual recebe as novidades pelo
// WebSocket e chama este endpoint apenas uma vez por conexão, para reconciliar.
// Continua sendo consultado em intervalo pelas versões já instaladas, e por
// isso o formato da resposta não pode mudar.
export async function listNotificationBadgesHandler(context: AuthedContext) {
  const user = context.get("user")

  const [grouped, unreadMessages, alerts] = await Promise.all([
    prisma.notification.groupBy({
      by: ["type"],
      where: { userId: user.id, readAt: null },
      _count: { _all: true },
    }),
    countUnreadMessages(user.id),
    prisma.notification.findMany({
      where: { userId: user.id, readAt: null, type: { in: ALERT_TYPES } },
      orderBy: { createdAt: "desc" },
      take: MAX_PENDING_ALERTS,
      select: { id: true, type: true, title: true, message: true },
    }),
  ])

  // Todas as áreas sempre presentes: o app não precisa tratar undefined e
  // simplesmente ignora as que não têm aba no perfil dele.
  const badges = Object.fromEntries(BADGE_AREAS.map((area) => [area, 0])) as Record<
    BadgeArea,
    number
  >

  for (const row of grouped) {
    const area = areaForNotification(row.type, user.role)

    // "messages" vem de Message.readAt (abaixo). Somar as notificações
    // MESSAGE_RECEIVED aqui dobraria a contagem.
    if (area === "messages") {
      continue
    }

    badges[area] += row._count._all
  }

  badges.messages = unreadMessages

  // Os textos vão como estão na notificação: o app não reescreve conteúdo por
  // tipo, então toast, central e push contam sempre a mesma história.
  return context.json({ badges, events: alerts })
}

// Marca notificações não lidas como lidas. Sem `area`, marca todas — é o que a
// central de notificações (e a versão do app já instalada) faz. Com `area`,
// marca apenas os tipos daquela aba, para o badge sumir só onde foi visualizado.
export async function markNotificationsReadHandler(context: AuthedContext) {
  const user = context.get("user")

  const body = await context.req.json().catch(() => null)
  const rawArea = (body as { area?: unknown } | null)?.area

  if (rawArea !== undefined && !isBadgeArea(rawArea)) {
    return context.json({ code: "INVALID_DATA", message: "Área inválida." }, 400)
  }

  const typeFilter =
    rawArea === undefined ? {} : { type: { in: notificationTypesForArea(rawArea, user.role) } }

  await prisma.notification.updateMany({
    where: { userId: user.id, readAt: null, ...typeFilter },
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
