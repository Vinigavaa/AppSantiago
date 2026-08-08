// Tipos de alvo aceitos pela API em POST /reports. Espelha o enum do backend.
export type ReportTargetType =
  | "USER"
  | "MESSAGE"
  | "REVIEW"
  | "SERVICE_REQUEST"
  | "PORTFOLIO_ITEM"

export type ReportReason =
  | "SPAM"
  | "ASSEDIO"
  | "CONTEUDO_SEXUAL"
  | "VIOLENCIA"
  | "DISCURSO_DE_ODIO"
  | "GOLPE"
  | "OUTRO"

// Rótulos exibidos no formulário, na ordem em que aparecem. "Outro" fica por
// último porque exige descrição.
export const reportReasons: { value: ReportReason; label: string }[] = [
  { value: "SPAM", label: "Spam ou propaganda" },
  { value: "GOLPE", label: "Golpe ou tentativa de fraude" },
  { value: "ASSEDIO", label: "Assédio ou ameaça" },
  { value: "DISCURSO_DE_ODIO", label: "Discurso de ódio" },
  { value: "CONTEUDO_SEXUAL", label: "Conteúdo sexual" },
  { value: "VIOLENCIA", label: "Violência" },
  { value: "OUTRO", label: "Outro motivo" },
]

// Descrição do que está sendo denunciado, para o título do formulário.
export const reportTargetLabels: Record<ReportTargetType, string> = {
  USER: "este perfil",
  MESSAGE: "esta mensagem",
  REVIEW: "esta avaliação",
  SERVICE_REQUEST: "esta solicitação",
  PORTFOLIO_ITEM: "este item do portfólio",
}
