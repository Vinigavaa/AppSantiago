import type { Ionicons } from "@expo/vector-icons"

import type { ToastTone } from "@/components/ui/Toast"

import type { NotificationType } from "./types"

type IoniconName = keyof typeof Ionicons.glyphMap

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

// Tom visual do aviso por tipo de notificação. Um tipo ausente aqui não gera
// toast — é o que mantém `SYSTEM` e `MESSAGE_RECEIVED` fora da tela (mensagem
// tem aviso próprio, montado a partir do evento do chat).
export const ALERT_TONE: Partial<Record<NotificationType, ToastTone>> = {
  PROPOSAL_RECEIVED: "info",
  PROPOSAL_ACCEPTED: "success",
  PROPOSAL_REJECTED: "info",
  SERVICE_UPDATED: "danger",
  REVIEW_RECEIVED: "success",
}

// Ícone da situação. Tipos que dividem o mesmo tom precisam de ícones próprios
// para serem distinguidos de relance.
export const ALERT_ICON: Partial<Record<NotificationType, IoniconName>> = {
  PROPOSAL_RECEIVED: "document-text",
  PROPOSAL_ACCEPTED: "checkmark-circle",
  PROPOSAL_REJECTED: "information-circle",
  SERVICE_UPDATED: "alert-circle",
  REVIEW_RECEIVED: "star",
}

// Aviso de mensagem de chat: não nasce de uma notificação, e sim do evento
// `message:new`, então tom e ícone são fixos.
export const MESSAGE_ALERT_TONE: ToastTone = "info"
export const MESSAGE_ALERT_ICON: IoniconName = "chatbubble-ellipses"

export const EMPTY_BADGES: Badges = {
  proposals: 0,
  messages: 0,
  services: 0,
  dashboard: 0,
  profile: 0,
}
