import { colors } from "@/features/client-home/theme"

import type { ProposalStatus, ServiceStatus } from "./types"

type StatusStyle = {
  label: string
  color: string
  background: string
}

const STATUS_STYLES: Record<ProposalStatus, StatusStyle> = {
  PENDING: { label: "Enviada", color: "#1D4ED8", background: "#E5EDFD" },
  ACCEPTED: { label: "Aceita", color: "#1F7A45", background: colors.accentSoftBg },
  REJECTED: { label: "Recusada", color: "#B91C1C", background: "#FCE8E8" },
  CANCELED: { label: "Cancelada", color: "#475569", background: "#EEF1F4" },
}

export function getProposalStatusStyle(status: ProposalStatus): StatusStyle {
  return STATUS_STYLES[status]
}

// Status atual do serviço contratado (aba "Aceitas").
const SERVICE_STATUS_STYLES: Record<ServiceStatus, StatusStyle> = {
  ACCEPTED: { label: "Contratado", color: "#1D4ED8", background: "#E5EDFD" },
  IN_PROGRESS: { label: "Em andamento", color: "#92600A", background: "#FBF1DD" },
  COMPLETED: { label: "Concluído", color: "#1F7A45", background: colors.accentSoftBg },
  CANCELED: { label: "Cancelado", color: "#B91C1C", background: "#FCE8E8" },
}

export function getServiceStatusStyle(status: ServiceStatus): StatusStyle {
  return SERVICE_STATUS_STYLES[status]
}

// Opções de prazo do formulário (valor em dias) e o rótulo correspondente.
// Devem espelhar ALLOWED_ESTIMATED_DAYS no backend.
export const ESTIMATED_DAYS_OPTIONS = [
  { value: 0, label: "Hoje" },
  { value: 1, label: "1 dia" },
  { value: 2, label: "2 dias" },
  { value: 3, label: "3 dias" },
  { value: 7, label: "Esta semana" },
] as const

export function getEstimatedDaysLabel(days: number | null): string {
  if (days === null) {
    return "A combinar"
  }

  return ESTIMATED_DAYS_OPTIONS.find((option) => option.value === days)?.label ?? `${days} dias`
}

const currencyFormatter = new Intl.NumberFormat("pt-BR", {
  minimumFractionDigits: 0,
  maximumFractionDigits: 2,
})

export function formatProposalPrice(price: number): string {
  return `R$ ${currencyFormatter.format(price)}`
}
