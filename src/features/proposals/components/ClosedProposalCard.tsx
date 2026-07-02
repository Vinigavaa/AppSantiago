import { Image, StyleSheet, Text, View } from "react-native"

import { getInitials } from "@/features/client-home/greeting"
import { colors, radius, spacing } from "@/features/client-home/theme"
import { formatRelativeTime } from "@/features/service-requests/format"

import { formatProposalPrice, getProposalStatusStyle } from "../format"
import type { ReceivedProposal } from "../types"

type Props = {
  proposal: ReceivedProposal
}

// Card da aba "Recusadas": propostas encerradas (recusadas pelo cliente ou
// canceladas pelo profissional). Apenas histórico — sem ações.
export function ClosedProposalCard({ proposal }: Props) {
  const { professional } = proposal
  const status = getProposalStatusStyle(proposal.status)

  return (
    <View style={styles.card}>
      <View style={styles.header}>
        {professional.avatarUrl ? (
          <Image source={{ uri: professional.avatarUrl }} style={styles.avatar} />
        ) : (
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>{getInitials(professional.name)}</Text>
          </View>
        )}

        <View style={styles.headerText}>
          <Text style={styles.name}>{professional.name}</Text>
          <Text numberOfLines={1} style={styles.serviceTitle}>
            {proposal.serviceRequest.category} · {proposal.serviceRequest.title}
          </Text>
        </View>

        <View style={[styles.statusPill, { backgroundColor: status.background }]}>
          <Text style={[styles.statusText, { color: status.color }]}>{status.label}</Text>
        </View>
      </View>

      <View style={styles.footer}>
        <Text style={styles.price}>{formatProposalPrice(proposal.price)}</Text>
        <Text style={styles.date}>Recebida {formatRelativeTime(proposal.createdAt)}</Text>
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  avatar: {
    alignItems: "center",
    backgroundColor: colors.avatarBg,
    borderRadius: radius.avatar,
    height: 40,
    justifyContent: "center",
    width: 40,
  },
  avatarText: {
    color: colors.avatarText,
    fontSize: 15,
    fontWeight: "700",
  },
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
  name: {
    color: colors.textPrimary,
    fontSize: 15,
    fontWeight: "700",
  },
  price: {
    color: colors.textSecondary,
    fontSize: 14,
    fontWeight: "600",
  },
  serviceTitle: {
    color: colors.textSecondary,
    fontSize: 13,
  },
  statusPill: {
    borderRadius: radius.tag,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  statusText: {
    fontSize: 12,
    fontWeight: "600",
  },
})
