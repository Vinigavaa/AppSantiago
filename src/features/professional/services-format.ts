import { colors } from "@/features/client-home/theme"

import type { ProfessionalService, ServiceContractStatus } from "./types"

type StatusStyle = {
  label: string
  color: string
  background: string
}

const STATUS_STYLES: Record<ServiceContractStatus, StatusStyle> = {
  ACCEPTED: { label: "Contratado", color: "#1D4ED8", background: "#E5EDFD" },
  IN_PROGRESS: { label: "Em andamento", color: "#92600A", background: "#FBF1DD" },
  COMPLETED: { label: "Concluído", color: "#1F7A45", background: colors.accentSoftBg },
  CANCELED: { label: "Cancelado", color: "#B91C1C", background: "#FCE8E8" },
}

export function getContractStatusStyle(status: ServiceContractStatus): StatusStyle {
  return STATUS_STYLES[status]
}

// Monta o endereço liberado para o profissional contratado em uma linha. Hoje a
// criação coleta cidade + bairro; demais campos aparecem quando informados.
export function formatServiceAddress(service: ProfessionalService): string {
  const { address, city } = service.serviceRequest
  const parts: string[] = []

  if (address.street) {
    parts.push(address.number ? `${address.street}, ${address.number}` : address.street)
  }

  if (address.complement) {
    parts.push(address.complement)
  }

  if (address.neighborhood) {
    parts.push(address.neighborhood)
  }

  parts.push(`${city.name}, ${city.state}`)

  if (address.zipCode) {
    parts.push(`CEP ${address.zipCode}`)
  }

  return parts.join(" · ")
}
