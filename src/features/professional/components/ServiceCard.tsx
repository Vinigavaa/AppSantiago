import { Ionicons } from "@expo/vector-icons"
import { StyleSheet, Text, View } from "react-native"

import { colors, radius, spacing } from "@/features/client-home/theme"
import { formatProposalPrice, getEstimatedDaysLabel } from "@/features/proposals/format"
import { formatRelativeTime } from "@/features/service-requests/format"

import { formatServiceAddress, getContractStatusStyle } from "../services-format"
import type { ProfessionalService } from "../types"

export function ServiceCard({ service }: { service: ProfessionalService }) {
  const status = getContractStatusStyle(service.status)

  return (
    <View style={styles.card}>
      <View style={styles.header}>
        <View style={styles.tag}>
          <Text style={styles.tagText}>{service.serviceRequest.category}</Text>
        </View>
        <View style={[styles.statusPill, { backgroundColor: status.background }]}>
          <Text style={[styles.statusText, { color: status.color }]}>{status.label}</Text>
        </View>
      </View>

      <Text style={styles.title}>{service.serviceRequest.title}</Text>

      <View style={styles.metrics}>
        <View style={styles.metric}>
          <Text style={styles.metricLabel}>Valor</Text>
          <Text style={styles.metricValue}>{formatProposalPrice(service.price)}</Text>
        </View>
        <View style={styles.metricDivider} />
        <View style={styles.metric}>
          <Text style={styles.metricLabel}>Prazo</Text>
          <Text style={styles.metricValue}>{getEstimatedDaysLabel(service.estimatedDays)}</Text>
        </View>
      </View>

      {/* Endereço e contato liberados apenas após a contratação. */}
      <View style={styles.releasedBlock}>
        <View style={styles.releasedRow}>
          <Ionicons color={colors.accent} name="location-outline" size={16} />
          <Text style={styles.releasedText}>{formatServiceAddress(service)}</Text>
        </View>
        <View style={styles.releasedRow}>
          <Ionicons color={colors.accent} name="person-outline" size={16} />
          <Text style={styles.releasedText}>
            {service.client.name}
            {service.client.phone ? ` · ${service.client.phone}` : ""}
          </Text>
        </View>
      </View>

      <Text style={styles.date}>Contratado {formatRelativeTime(service.acceptedAt)}</Text>
    </View>
  )
}

const styles = StyleSheet.create({
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
    justifyContent: "space-between",
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
  releasedBlock: {
    backgroundColor: colors.accentSoftBg,
    borderRadius: radius.tag,
    gap: 8,
    padding: 12,
  },
  releasedRow: {
    alignItems: "center",
    flexDirection: "row",
    gap: 8,
  },
  releasedText: {
    color: colors.textSecondary,
    flexShrink: 1,
    fontSize: 13,
    lineHeight: 18,
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
  tag: {
    backgroundColor: colors.accentSoftBg,
    borderRadius: radius.tag,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  tagText: {
    color: colors.accent,
    fontSize: 12,
    fontWeight: "500",
  },
  title: {
    color: colors.textPrimary,
    fontSize: 17,
    fontWeight: "700",
  },
})
