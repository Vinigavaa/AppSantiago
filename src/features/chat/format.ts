// Horário curto de uma mensagem (ex.: "14:32"), exibido em cada balão.
export function formatMessageTime(iso: string): string {
  return new Date(iso).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })
}

// Marca de tempo da última mensagem na lista de conversas: hoje mostra a hora,
// ontem mostra "Ontem", e datas anteriores mostram dia/mês.
export function formatChatListTime(iso: string): string {
  const date = new Date(iso)
  const now = new Date()

  if (date.toDateString() === now.toDateString()) {
    return date.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })
  }

  const yesterday = new Date(now)
  yesterday.setDate(now.getDate() - 1)

  if (date.toDateString() === yesterday.toDateString()) {
    return "Ontem"
  }

  return date.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" })
}
