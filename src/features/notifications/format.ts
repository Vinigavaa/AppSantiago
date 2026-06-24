import type { Ionicons } from "@expo/vector-icons"

import { colors } from "@/features/client-home/theme"

import type { NotificationType } from "./types"

type IoniconName = keyof typeof Ionicons.glyphMap

// Ícone e cor por tipo de notificação, para leitura rápida na central.
const STYLES: Record<NotificationType, { icon: IoniconName; color: string }> = {
  SYSTEM: { icon: "information-circle-outline", color: colors.textSecondary },
  PROPOSAL_RECEIVED: { icon: "document-text-outline", color: colors.accent },
  PROPOSAL_ACCEPTED: { icon: "checkmark-circle-outline", color: colors.accent },
  PROPOSAL_REJECTED: { icon: "close-circle-outline", color: colors.danger },
  MESSAGE_RECEIVED: { icon: "chatbubble-ellipses-outline", color: colors.accent },
  SERVICE_UPDATED: { icon: "construct-outline", color: colors.accent },
  REVIEW_RECEIVED: { icon: "star-outline", color: "#F5A623" },
}

export function getNotificationStyle(type: NotificationType) {
  return STYLES[type] ?? STYLES.SYSTEM
}
