import { appFetch, type ApiResult } from "@/lib/api-client"

import type { AppNotification } from "./types"

export type NotificationsPayload = {
  notifications: AppNotification[]
  unreadCount: number
}

export async function fetchNotifications(): Promise<ApiResult<NotificationsPayload>> {
  return appFetch<NotificationsPayload>("/notifications")
}

export async function markNotificationsRead(): Promise<ApiResult<{ ok: true }>> {
  return appFetch<{ ok: true }>("/notifications/read", { method: "POST" })
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
