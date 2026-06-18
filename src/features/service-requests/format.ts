import { colors } from "@/features/client-home/theme"

import type { RequestStatus, Urgency } from "./types"

type StatusStyle = {
  label: string
  color: string
  background: string
}

const STATUS_STYLES: Record<RequestStatus, StatusStyle> = {
  OPEN: { label: "Aberta", color: "#1F7A45", background: colors.accentSoftBg },
  IN_NEGOTIATION: { label: "Em negociação", color: "#92600A", background: "#FBF1DD" },
  ACCEPTED: { label: "Contratada", color: "#1D4ED8", background: "#E5EDFD" },
  IN_PROGRESS: { label: "Em andamento", color: "#1D4ED8", background: "#E5EDFD" },
  COMPLETED: { label: "Concluída", color: "#475569", background: "#EEF1F4" },
  CANCELED: { label: "Cancelada", color: "#B91C1C", background: "#FCE8E8" },
}

export function getStatusStyle(status: RequestStatus): StatusStyle {
  return STATUS_STYLES[status]
}

const URGENCY_LABELS: Record<Urgency, string> = {
  URGENT: "O quanto antes",
  THIS_WEEK: "Nos próximos dias",
  FLEXIBLE: "Sem pressa",
}

export function getUrgencyLabel(urgency: Urgency): string {
  return URGENCY_LABELS[urgency]
}

const currencyFormatter = new Intl.NumberFormat("pt-BR", {
  maximumFractionDigits: 0,
})

// Faixa de orçamento legível; "A combinar" quando não informada.
export function formatBudget(min: number | null, max: number | null): string {
  if (min !== null && max !== null) {
    return `R$ ${currencyFormatter.format(min)} - ${currencyFormatter.format(max)}`
  }

  if (min !== null) {
    return `A partir de R$ ${currencyFormatter.format(min)}`
  }

  if (max !== null) {
    return `Até R$ ${currencyFormatter.format(max)}`
  }

  return "A combinar"
}

// Tempo relativo curto (agora, há 2h, há 3 dias).
export function formatRelativeTime(iso: string): string {
  const created = new Date(iso).getTime()

  if (Number.isNaN(created)) {
    return ""
  }

  const diffMinutes = Math.max(0, Math.floor((Date.now() - created) / 60000))

  if (diffMinutes < 1) {
    return "agora"
  }

  if (diffMinutes < 60) {
    return `há ${diffMinutes} min`
  }

  const diffHours = Math.floor(diffMinutes / 60)

  if (diffHours < 24) {
    return `há ${diffHours}h`
  }

  const diffDays = Math.floor(diffHours / 24)

  if (diffDays === 1) {
    return "há 1 dia"
  }

  if (diffDays < 30) {
    return `há ${diffDays} dias`
  }

  return new Date(iso).toLocaleDateString("pt-BR")
}
