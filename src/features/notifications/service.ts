import { appFetch, type ApiResult } from "@/lib/api-client"

import type { BadgeArea, Badges, PendingAlert } from "./badges-types"
import type { AppNotification } from "./types"

export type NotificationsPayload = {
  notifications: AppNotification[]
  unreadCount: number
}

export async function fetchNotifications(): Promise<ApiResult<NotificationsPayload>> {
  return appFetch<NotificationsPayload>("/notifications")
}

// Contagem de pendências por aba. Chamado em intervalo curto, então é o endpoint
// enxuto — não carrega a lista de notificações.
// `events` é opcional na tipagem porque um servidor anterior a este recurso
// responde só com `badges` — nesse caso o app apenas não exibe avisos.
export async function fetchNotificationBadges(): Promise<
  ApiResult<{ badges: Badges; events?: PendingAlert[] }>
> {
  return appFetch<{ badges: Badges; events?: PendingAlert[] }>("/notifications/badges")
}

// Sem `area`, marca tudo como lido (central de notificações). Com `area`, marca
// apenas os tipos daquela aba, para o indicador sumir só onde foi visualizado.
export async function markNotificationsRead(area?: BadgeArea): Promise<ApiResult<{ ok: true }>> {
  return appFetch<{ ok: true }>("/notifications/read", {
    method: "POST",
    body: area ? { area } : undefined,
  })
}

export async function registerPushToken(
  token: string,
  platform: string,
): Promise<ApiResult<{ ok: true }>> {
  return appFetch<{ ok: true }>("/push-tokens", {
    method: "POST",
    body: { token, platform },
  })
}
