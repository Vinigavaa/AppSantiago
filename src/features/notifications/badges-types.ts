import type { ToastTone } from "@/components/ui/Toast"

import type { NotificationType } from "./types"

// Áreas da navegação inferior que podem exibir indicador de pendência. Espelha
// o contrato de GET /notifications/badges — o backend sempre devolve todas as
// chaves, e cada perfil ignora as áreas que não têm aba.
export const BADGE_AREAS = [
  "proposals",
  "messages",
  "services",
  "dashboard",
  "profile",
] as const

export type BadgeArea = (typeof BADGE_AREAS)[number]

export type Badges = Record<BadgeArea, number>

// Evento que merece um aviso imediato além do indicador da aba. Os textos vêm
// prontos do servidor — o app não reescreve conteúdo por tipo.
export type PendingAlert = {
  id: string
  type: NotificationType
  title: string
  message: string
}

// Tom visual do aviso por tipo de notificação.
export const ALERT_TONE: Partial<Record<NotificationType, ToastTone>> = {
  PROPOSAL_ACCEPTED: "success",
  PROPOSAL_REJECTED: "info",
  SERVICE_UPDATED: "danger",
}

export const EMPTY_BADGES: Badges = {
  proposals: 0,
  messages: 0,
  services: 0,
  dashboard: 0,
  profile: 0,
}
