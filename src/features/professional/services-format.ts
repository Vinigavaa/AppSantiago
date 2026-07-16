import { status } from "@/features/client-home/theme"

import type { ProfessionalService, ServiceContractStatus } from "./types"

type StatusStyle = {
  label: string
  color: string
  background: string
}

const STATUS_STYLES: Record<ServiceContractStatus, StatusStyle> = {
  ACCEPTED: { label: "Contratado", color: status.info.color, background: status.info.background },
  IN_PROGRESS: { label: "Em andamento", color: status.warning.color, background: status.warning.background },
  COMPLETED: { label: "Concluído", color: status.success.color, background: status.success.background },
  CANCELED: { label: "Cancelado", color: status.danger.color, background: status.danger.background },
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
