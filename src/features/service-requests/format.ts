import { status } from "@/features/client-home/theme"

import type { RequestStatus, Urgency } from "./types"

type StatusStyle = {
  label: string
  color: string
  background: string
}

const STATUS_STYLES: Record<RequestStatus, StatusStyle> = {
  OPEN: { label: "Aberta", ...status.success },
  IN_NEGOTIATION: { label: "Em negociação", ...status.warning },
  ACCEPTED: { label: "Contratada", ...status.info },
  IN_PROGRESS: { label: "Em andamento", ...status.info },
  COMPLETED: { label: "Concluída", ...status.neutral },
  CANCELED: { label: "Cancelada", ...status.danger },
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

// Data completa legível: "1 de julho de 2026".
export function formatFullDate(iso: string): string {
  const date = new Date(iso)

  if (Number.isNaN(date.getTime())) {
    return ""
  }

  return date.toLocaleDateString("pt-BR", { day: "numeric", month: "long", year: "numeric" })
}

// Rótulo de última edição: "Hoje às 14:37", "Ontem às 09:05" ou a data cheia.
export function formatEditedAt(iso: string): string {
  const date = new Date(iso)

  if (Number.isNaN(date.getTime())) {
    return ""
  }

  const time = date.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })
  const startOfToday = new Date()
  startOfToday.setHours(0, 0, 0, 0)

  const dayDiff = Math.floor((startOfToday.getTime() - date.getTime()) / (24 * 60 * 60 * 1000))

  if (dayDiff < 0) {
    return `Hoje às ${time}`
  }

  if (dayDiff === 0) {
    return `Ontem às ${time}`
  }

  return `${formatFullDate(iso)} às ${time}`
}

// Considera a solicitação editada quando updatedAt supera createdAt com folga
// (o @updatedAt do banco começa igual ao createdAt na criação).
export function wasEdited(createdAt: string, updatedAt: string): boolean {
  return new Date(updatedAt).getTime() - new Date(createdAt).getTime() > 2000
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
