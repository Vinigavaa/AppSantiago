import { StyleSheet, Text, View } from "react-native"

import { StatCards } from "@/features/client-home/components/StatCards"
import { colors, radius } from "@/features/client-home/theme"

import type { ProfessionalStats } from "../types"

export function StatsSection({ stats }: { stats: ProfessionalStats }) {
  const isEmpty = stats.servicesCompleted === 0 && stats.proposalsSent === 0

  if (isEmpty) {
    return (
      <View style={styles.empty}>
        <Text style={styles.emptyText}>
          Suas estatísticas aparecerão aqui após os primeiros atendimentos.
        </Text>
      </View>
    )
  }

  return (
    <StatCards
      items={[
        { label: "Serviços", value: stats.servicesCompleted },
        { label: "Propostas", value: stats.proposalsSent },
        { label: "Contratação", value: `${Math.round(stats.hireRate * 100)}%` },
      ]}
    />
  )
}

const styles = StyleSheet.create({
  empty: {
    backgroundColor: colors.surface,
    borderColor: colors.cardBorder,
    borderRadius: radius.card,
    borderWidth: 1,
    paddingHorizontal: 20,
    paddingVertical: 24,
  },
  emptyText: {
    color: colors.textSecondary,
    fontSize: 14,
    lineHeight: 20,
    textAlign: "center",
  },
})
