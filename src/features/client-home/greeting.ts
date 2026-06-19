// Saudação dinâmica conforme o horário do dispositivo.
export function getGreeting(date = new Date()): string {
  const hour = date.getHours()

  if (hour < 12) {
    return "Bom dia"
  }

  if (hour < 18) {
    return "Boa tarde"
  }

  return "Boa noite"
}

// Primeiro nome, para uma saudação mais próxima.
export function getFirstName(fullName: string | null | undefined): string {
  if (!fullName) {
    return "por aqui"
  }

  return fullName.trim().split(/\s+/)[0] ?? fullName
}

// Iniciais (primeira + última) para o avatar.
export function getInitials(fullName: string | null | undefined): string {
  if (!fullName) {
    return "?"
  }

  const parts = fullName.trim().split(/\s+/)
  const first = parts[0]?.[0] ?? ""
  const last = parts.length > 1 ? (parts[parts.length - 1]?.[0] ?? "") : ""

  return (first + last).toUpperCase() || "?"
}
