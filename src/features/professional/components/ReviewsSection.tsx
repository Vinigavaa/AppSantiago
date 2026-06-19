import { StyleSheet, Text, View } from "react-native"

import { EmptyState } from "@/features/client-home/components/EmptyState"
import { colors, radius, spacing } from "@/features/client-home/theme"

import type { ProfessionalReview } from "../types"
import { Stars } from "./Stars"

type Props = {
  reviews: ProfessionalReview[]
  isLoading: boolean
  error: string | null
}

function formatDate(iso: string): string {
  const date = new Date(iso)
  return Number.isNaN(date.getTime()) ? "" : date.toLocaleDateString("pt-BR")
}

export function ReviewsSection({ reviews, isLoading, error }: Props) {
  if (isLoading && reviews.length === 0) {
    return null
  }

  if (error && reviews.length === 0) {
    return <Text style={styles.error}>{error}</Text>
  }

  if (reviews.length === 0) {
    return (
      <EmptyState
        description="Quando os clientes avaliarem seus serviços, os comentários aparecerão aqui."
        icon="star-outline"
        title="Você ainda não recebeu avaliações."
      />
    )
  }

  return (
    <View style={styles.list}>
      {reviews.map((review) => (
        <View key={review.id} style={styles.card}>
          <View style={styles.topRow}>
            <Stars rating={review.rating} size={15} />
            <Text style={styles.date}>{formatDate(review.createdAt)}</Text>
          </View>

          {review.comment ? <Text style={styles.comment}>{review.comment}</Text> : null}

          <Text style={styles.service}>
            Serviço: {review.serviceTitle}
            <Text style={styles.category}> · {review.serviceCategory}</Text>
          </Text>
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
    gap: 8,
    padding: spacing.card,
  },
  category: {
    color: colors.textTertiary,
  },
  comment: {
    color: colors.textPrimary,
    fontSize: 15,
    lineHeight: 21,
  },
  date: {
    color: colors.textTertiary,
    fontSize: 13,
  },
  error: {
    color: colors.textSecondary,
    fontSize: 14,
    textAlign: "center",
  },
  list: {
    gap: spacing.cardGap,
  },
  service: {
    color: colors.textSecondary,
    fontSize: 13,
  },
  topRow: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
  },
})
