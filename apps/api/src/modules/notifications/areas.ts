import type { NotificationType } from "@prisma/client"

// Áreas da navegação inferior do app. Nem todas existem nos dois perfis: o
// cliente não tem "dashboard" nem "services", o profissional não tem "proposals".
// O app simplesmente ignora as áreas que não têm aba no perfil dele.
export const BADGE_AREAS = [
  "proposals",
  "messages",
  "services",
  "dashboard",
  "profile",
] as const

export type BadgeArea = (typeof BADGE_AREAS)[number]

// Onde cada novidade aparece na barra de abas. O mesmo tipo cai em abas
// diferentes conforme o perfil: uma proposta aceita é "Propostas" para o cliente
// e "Serviços" para o profissional.
//
// Para o profissional, "dashboard" guarda o que ainda está em disputa (proposta
// recebida, proposta não selecionada). Quando o cliente aceita, o que nasce é um
// serviço contratado — e é na aba "Serviços" que ele aparece.
//
// MESSAGE_RECEIVED é mapeado para "messages" apenas para a marcação de leitura.
// A CONTAGEM do badge de mensagens NÃO vem daqui — vem de Message.readAt, que é
// atualizado ao abrir cada conversa. Contar as duas fontes dobraria o número.
const AREA_BY_TYPE: Record<NotificationType, { client: BadgeArea; professional: BadgeArea }> = {
  PROPOSAL_RECEIVED: { client: "proposals", professional: "dashboard" },
  PROPOSAL_ACCEPTED: { client: "proposals", professional: "services" },
  PROPOSAL_REJECTED: { client: "proposals", professional: "dashboard" },
  SERVICE_UPDATED: { client: "proposals", professional: "services" },
  REVIEW_RECEIVED: { client: "profile", professional: "profile" },
  MESSAGE_RECEIVED: { client: "messages", professional: "messages" },
  SYSTEM: { client: "profile", professional: "profile" },
}

// Tipos que rendem um aviso imediato (toast) além do indicador da aba: mudanças
// que o usuário não deve descobrir só ao abrir a aba certa.
//
// MESSAGE_RECEIVED fica de fora de propósito: mensagem já tem push, contagem
// própria e a conversa em si — um toast por mensagem recebida só poluiria.
export const ALERT_TYPES: NotificationType[] = [
  "PROPOSAL_ACCEPTED",
  "PROPOSAL_REJECTED",
  "SERVICE_UPDATED",
]

function isProfessional(role: string): boolean {
  return role === "PROFESSIONAL"
}

// Área de uma notificação. Tipo desconhecido (enum novo ainda não mapeado) cai
// em "profile", que é a aba neutra presente nos dois perfis.
export function areaForNotification(type: NotificationType, role: string): BadgeArea {
  const entry = AREA_BY_TYPE[type]

  if (!entry) {
    return "profile"
  }

  return isProfessional(role) ? entry.professional : entry.client
}

// Tipos que pertencem a uma área, usados para marcar apenas aquela área como lida.
export function notificationTypesForArea(area: BadgeArea, role: string): NotificationType[] {
  const types = Object.keys(AREA_BY_TYPE) as NotificationType[]
  return types.filter((type) => areaForNotification(type, role) === area)
}

export function isBadgeArea(value: unknown): value is BadgeArea {
  return typeof value === "string" && (BADGE_AREAS as readonly string[]).includes(value)
}
