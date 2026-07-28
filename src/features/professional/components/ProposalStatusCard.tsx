import { Ionicons } from "@expo/vector-icons"
import { StyleSheet, Text, View } from "react-native"

import { colors, radius, spacing, status as statusPalette } from "@/features/client-home/theme"
import { formatProposalPrice } from "@/features/proposals/format"
import { formatRelativeTime } from "@/features/service-requests/format"

import type { ProfessionalProposal } from "../types"

type ProposalStatus = "pending" | "rejected"

type Props = {
  proposal: ProfessionalProposal
  status: ProposalStatus
}

// Aparência de cada situação, usando a paleta semântica do app: âmbar para o que
// ainda depende do cliente, vermelho para a oportunidade perdida.
const APPEARANCE = {
  pending: {
    icon: "hourglass-outline",
    label: "Aguardando resposta",
    tone: statusPalette.warning,
  },
  rejected: {
    icon: "close-circle-outline",
    label: "Recusada",
    tone: statusPalette.danger,
  },
} as const satisfies Record<
  ProposalStatus,
  { icon: keyof typeof Ionicons.glyphMap; label: string; tone: { color: string; background: string } }
>

// Cartão somente leitura de uma proposta enviada pelo profissional. Exibido nos
// filtros "Propostas em aberto" e "Propostas recusadas" da tela de serviços.
export function ProposalStatusCard({ proposal, status }: Props) {
  const { serviceRequest } = proposal
  const appearance = APPEARANCE[status]

  return (
    <View style={[styles.card, status === "rejected" && styles.cardMuted]}>
      <View style={styles.header}>
        <View style={[styles.iconWrap, { backgroundColor: appearance.tone.background }]}>
          <Ionicons color={appearance.tone.color} name={appearance.icon} size={20} />
        </View>

        <View style={styles.headerText}>
          <Text numberOfLines={1} style={styles.title}>
            {serviceRequest.title}
          </Text>
          <Text numberOfLines={1} style={styles.subtitle}>
            {serviceRequest.category} · {serviceRequest.city.name}
          </Text>
          <Text numberOfLines={1} style={styles.client}>
            Cliente: {serviceRequest.client.name}
          </Text>
        </View>

        <View style={[styles.pill, { backgroundColor: appearance.tone.background }]}>
          <Text style={[styles.pillText, { color: appearance.tone.color }]}>
            {appearance.label}
          </Text>
        </View>
      </View>

      <View style={styles.footer}>
        <Text style={styles.price}>{formatProposalPrice(proposal.price)}</Text>
        <Text style={styles.date}>Enviada {formatRelativeTime(proposal.createdAt)}</Text>
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderColor: colors.cardBorder,
    borderRadius: radius.card,
    borderWidth: 1,
    gap: 10,
    padding: spacing.card,
  },
  cardMuted: {
    opacity: 0.9,
  },
  client: {
    color: colors.textTertiary,
    fontSize: 13,
  },
  date: {
    color: colors.textTertiary,
    fontSize: 12,
  },
  footer: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
  },
  header: {
    alignItems: "center",
    flexDirection: "row",
    gap: 12,
  },
  headerText: {
    flex: 1,
    gap: 2,
  },
  iconWrap: {
    alignItems: "center",
    borderRadius: radius.avatar,
    height: 40,
    justifyContent: "center",
    width: 40,
  },
  pill: {
    borderRadius: radius.tag,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  pillText: {
    fontSize: 12,
    fontWeight: "600",
  },
  price: {
    color: colors.textSecondary,
    fontSize: 14,
    fontWeight: "600",
  },
  subtitle: {
    color: colors.textSecondary,
    fontSize: 13,
  },
  title: {
    color: colors.textPrimary,
    fontSize: 15,
    fontWeight: "700",
  },
})
