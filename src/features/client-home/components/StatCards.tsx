import { StyleSheet, Text, View } from "react-native"

import { colors, radius, spacing } from "../theme"

export type Stat = {
  label: string
  value: string | number
}

// Linha de cartões de indicadores. Visual compartilhado entre o resumo do
// cliente (Home) e o dashboard do profissional.
export function StatCards({ items }: { items: Stat[] }) {
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
