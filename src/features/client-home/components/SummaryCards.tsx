import { StyleSheet, Text, View } from "react-native"

import type { ClientSummary } from "@/features/service-requests/types"

import { colors, radius, spacing } from "../theme"

type Props = {
  summary: ClientSummary | null
}

export function SummaryCards({ summary }: Props) {
  const items = [
    { label: "Abertas", value: summary?.openRequests ?? 0 },
    { label: "Propostas", value: summary?.pendingProposals ?? 0 },
    { label: "Concluídos", value: summary?.completedServices ?? 0 },
  ]

  return (
    <View style={styles.row}>
      {items.map((item) => (
        <View key={item.label} style={styles.card}>
          <Text style={styles.value}>{item.value}</Text>
          <Text style={styles.label}>{item.label}</Text>
        </View>
      ))}
    </View>
  )
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderColor: colors.cardBorder,
    borderRadius: radius.card,
    borderWidth: 1,
    flex: 1,
    paddingHorizontal: 12,
    paddingVertical: 16,
  },
  label: {
    color: colors.textSecondary,
    fontSize: 13,
    marginTop: 4,
  },
  row: {
    flexDirection: "row",
    gap: spacing.cardGap,
  },
  value: {
    color: colors.textPrimary,
    fontSize: 24,
    fontWeight: "700",
  },
})
