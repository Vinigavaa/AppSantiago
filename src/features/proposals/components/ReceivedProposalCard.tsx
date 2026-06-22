import { Image, StyleSheet, Text, View } from "react-native"

import { getInitials } from "@/features/client-home/greeting"
import { colors, radius, spacing } from "@/features/client-home/theme"
import { formatRelativeTime } from "@/features/service-requests/format"
import { Stars } from "@/features/professional/components/Stars"

import { formatProposalPrice, getEstimatedDaysLabel, getProposalStatusStyle } from "../format"
import type { ReceivedProposal } from "../types"

export function ReceivedProposalCard({ proposal }: { proposal: ReceivedProposal }) {
  const { professional } = proposal
  const status = getProposalStatusStyle(proposal.status)
  const ratingLabel =
    professional.ratingCount > 0
      ? `${professional.ratingAverage.toFixed(1)} (${professional.ratingCount})`
      : "Novo profissional"

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
          <View style={styles.ratingRow}>
            <Stars rating={professional.ratingCount > 0 ? professional.ratingAverage : 0} size={13} />
            <Text style={styles.ratingLabel}>{ratingLabel}</Text>
          </View>
        </View>

        <View style={[styles.statusPill, { backgroundColor: status.background }]}>
          <Text style={[styles.statusText, { color: status.color }]}>{status.label}</Text>
        </View>
      </View>

      <Text style={styles.serviceTitle} numberOfLines={1}>
        {proposal.serviceRequest.category} · {proposal.serviceRequest.title}
      </Text>

      <View style={styles.metrics}>
        <View style={styles.metric}>
          <Text style={styles.metricLabel}>Valor</Text>
          <Text style={styles.metricValue}>{formatProposalPrice(proposal.price)}</Text>
        </View>
        <View style={styles.metricDivider} />
        <View style={styles.metric}>
          <Text style={styles.metricLabel}>Prazo</Text>
          <Text style={styles.metricValue}>{getEstimatedDaysLabel(proposal.estimatedDays)}</Text>
        </View>
      </View>

      <Text style={styles.message}>{proposal.message}</Text>

      <Text style={styles.date}>Recebida {formatRelativeTime(proposal.createdAt)}</Text>
    </View>
  )
}

const styles = StyleSheet.create({
  avatar: {
    alignItems: "center",
    backgroundColor: colors.avatarBg,
    borderRadius: radius.avatar,
    height: 44,
    justifyContent: "center",
    width: 44,
  },
  avatarText: {
    color: colors.avatarText,
    fontSize: 16,
    fontWeight: "700",
  },
  card: {
    backgroundColor: colors.surface,
    borderColor: colors.cardBorder,
    borderRadius: radius.card,
    borderWidth: 1,
    gap: 12,
    padding: spacing.card,
  },
  date: {
    color: colors.textTertiary,
    fontSize: 12,
  },
  header: {
    alignItems: "center",
    flexDirection: "row",
    gap: 12,
  },
  headerText: {
    flex: 1,
    gap: 3,
  },
  message: {
    color: colors.textSecondary,
    fontSize: 14,
    lineHeight: 20,
  },
  metric: {
    flex: 1,
    gap: 2,
  },
  metricDivider: {
    backgroundColor: colors.cardBorder,
    width: 1,
  },
  metricLabel: {
    color: colors.textSecondary,
    fontSize: 12,
  },
  metricValue: {
    color: colors.textPrimary,
    fontSize: 15,
    fontWeight: "700",
  },
  metrics: {
    backgroundColor: colors.screenBg,
    borderRadius: radius.tag,
    flexDirection: "row",
    gap: 12,
    padding: 12,
  },
  name: {
    color: colors.textPrimary,
    fontSize: 15,
    fontWeight: "700",
  },
  ratingLabel: {
    color: colors.textSecondary,
    fontSize: 12,
  },
  ratingRow: {
    alignItems: "center",
    flexDirection: "row",
    gap: 6,
  },
  serviceTitle: {
    color: colors.textSecondary,
    fontSize: 13,
    fontWeight: "500",
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
