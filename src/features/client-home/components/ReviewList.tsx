import { StyleSheet, Text, View } from "react-native"

import { Stars } from "@/components/ui/Stars"

import { EmptyState } from "./EmptyState"
import type { ReviewItem } from "../reputation-types"
import { colors, radius, spacing } from "../theme"

type Props = {
  reviews: ReviewItem[]
  isLoading: boolean
  error: string | null
  emptyTitle: string
  emptyDescription: string
}

function formatDate(iso: string): string {
  const date = new Date(iso)
  return Number.isNaN(date.getTime()) ? "" : date.toLocaleDateString("pt-BR")
}

// Quantas avaliações o perfil mostra. A lista é uma amostra recente, não o
// histórico completo: as mais novas são as que importam para dar o recado.
const MAX_VISIBLE_REVIEWS = 3

// Lista das avaliações mais recentes. Compartilhada pelo perfil do cliente e do
// profissional; só o texto do estado vazio muda entre os dois.
export function ReviewList({ reviews, isLoading, error, emptyTitle, emptyDescription }: Props) {
  if (isLoading && reviews.length === 0) {
    return null
  }

  if (error && reviews.length === 0) {
    return <Text style={styles.error}>{error}</Text>
  }

  if (reviews.length === 0) {
    return <EmptyState description={emptyDescription} icon="star-outline" title={emptyTitle} />
  }

  // O backend já entrega em ordem decrescente de data, então os primeiros são
  // exatamente as avaliações mais recentes.
  const visible = reviews.slice(0, MAX_VISIBLE_REVIEWS)

  return (
    <View style={styles.list}>
      {visible.map((review) => (
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
