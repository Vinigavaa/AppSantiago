import { Ionicons } from "@expo/vector-icons"
import { StyleSheet, Text, View } from "react-native"

import { colors, radius, spacing } from "@/features/client-home/theme"
import { formatProposalPrice } from "@/features/proposals/format"
import { formatRelativeTime } from "@/features/service-requests/format"

import type { RejectedProposal } from "../types"

type Props = {
  proposal: RejectedProposal
}

// Histórico somente leitura de uma proposta que o cliente não aceitou. Exibida
// no filtro "Propostas recusadas" da tela de serviços.
export function RejectedProposalCard({ proposal }: Props) {
  const { serviceRequest } = proposal

  return (
    <View style={styles.card}>
      <View style={styles.header}>
        <View style={styles.iconWrap}>
          <Ionicons color={colors.danger} name="close-circle-outline" size={20} />
        </View>

        <View style={styles.headerText}>
          <Text numberOfLines={1} style={styles.title}>
            {serviceRequest.title}
          </Text>
          <Text numberOfLines={1} style={styles.subtitle}>
            {serviceRequest.category} · {serviceRequest.city.name}
          </Text>
        </View>

        <View style={styles.pill}>
          <Text style={styles.pillText}>Recusada</Text>
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
    opacity: 0.9,
    padding: spacing.card,
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
    backgroundColor: "#FCE8E8",
    borderRadius: radius.avatar,
    height: 40,
    justifyContent: "center",
    width: 40,
  },
  pill: {
    backgroundColor: "#FCE8E8",
    borderRadius: radius.tag,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  pillText: {
    color: colors.danger,
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
