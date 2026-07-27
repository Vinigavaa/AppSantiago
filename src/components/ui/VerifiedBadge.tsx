import { Ionicons } from "@expo/vector-icons"

import { colors } from "@/features/client-home/theme"

// Selo de assinante verificado (Pro): um "check" azul exibido ao lado do nome do
// profissional em toda superfície onde ele aparece (busca, perfil, chat, proposta).
// Passa mais credibilidade. A fonte da verdade é sempre o servidor (assinatura
// ativa via `isVerified`); aqui só renderizamos o selo quando ele vem marcado.
export function VerifiedBadge({ size = 16 }: { size?: number }) {
  return (
    <Ionicons
      accessibilityLabel="Profissional verificado"
      color={colors.highlight}
      name="checkmark-circle"
      size={size}
    />
  )
}
