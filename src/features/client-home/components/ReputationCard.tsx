import { type DimensionValue, StyleSheet, Text, View } from "react-native"

import { STAR_COLOR, Stars } from "@/components/ui/Stars"

import type { RatingDistribution } from "../reputation-types"
import { colors, radius, spacing } from "../theme"

type Props = {
  ratingAverage: number
  ratingCount: number
  distribution: RatingDistribution
}

const STAR_ROWS: (keyof RatingDistribution)[] = ["5", "4", "3", "2", "1"]

// Cartão de reputação: nota média + distribuição por estrelas. Compartilhado
// entre o perfil do cliente e o do profissional.
export function ReputationCard({ ratingAverage, ratingCount, distribution }: Props) {
  const maxCount = Math.max(1, ...STAR_ROWS.map((key) => distribution[key]))

  return (
    <View style={styles.card}>
      <View style={styles.summary}>
        <View style={styles.scoreColumn}>
          <Text style={styles.score}>{ratingCount > 0 ? ratingAverage.toFixed(1) : "—"}</Text>
          <Text style={styles.scoreMax}>de 5</Text>
        </View>

        <View style={styles.summaryRight}>
          <Stars rating={ratingCount > 0 ? ratingAverage : 0} size={18} />
          <Text style={styles.count}>
            {ratingCount === 0
              ? "Sem avaliações ainda"
              : `${ratingCount} ${ratingCount === 1 ? "avaliação" : "avaliações"}`}
          </Text>
        </View>
      </View>

      {ratingCount > 0 ? (
        <View style={styles.distribution}>
          {STAR_ROWS.map((key) => {
            const value = distribution[key]
            const width = `${Math.round((value / maxCount) * 100)}%` as DimensionValue

            return (
              <View key={key} style={styles.distRow}>
                <Text style={styles.distLabel}>{key}</Text>
                <View style={styles.track}>
                  <View style={[styles.fill, { width }]} />
                </View>
                <Text style={styles.distValue}>{value}</Text>
              </View>
            )
          })}
        </View>
      ) : null}
    </View>
  )
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderColor: colors.cardBorder,
    borderRadius: radius.card,
    borderWidth: 1,
    gap: 16,
    padding: spacing.card,
  },
  count: {
    color: colors.textSecondary,
    fontSize: 14,
  },
  distLabel: {
    color: colors.textSecondary,
    fontSize: 13,
    width: 12,
  },
  distRow: {
    alignItems: "center",
    flexDirection: "row",
    gap: 10,
  },
  distValue: {
    color: colors.textSecondary,
    fontSize: 13,
    textAlign: "right",
    width: 24,
  },
  distribution: {
    gap: 8,
  },
  fill: {
    backgroundColor: STAR_COLOR,
    borderRadius: 999,
    height: "100%",
  },
  score: {
    color: colors.textPrimary,
    fontSize: 40,
    fontWeight: "800",
    lineHeight: 44,
  },
  scoreColumn: {
    alignItems: "center",
  },
  scoreMax: {
    color: colors.textTertiary,
    fontSize: 13,
  },
  summary: {
    alignItems: "center",
    flexDirection: "row",
    gap: 20,
  },
  summaryRight: {
    gap: 8,
  },
  track: {
    backgroundColor: colors.iconMutedBg,
    borderRadius: 999,
    flex: 1,
    height: 8,
    overflow: "hidden",
  },
})
