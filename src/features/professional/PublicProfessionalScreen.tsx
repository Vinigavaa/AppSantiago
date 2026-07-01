import { Ionicons } from "@expo/vector-icons"
import { router } from "expo-router"
import { useCallback, useEffect, useState } from "react"
import {
  ActivityIndicator,
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native"
import { useSafeAreaInsets } from "react-native-safe-area-context"

import { Button } from "@/components/ui/Button"
import { getInitials } from "@/features/client-home/greeting"
import { colors, radius, spacing } from "@/features/client-home/theme"
import { formatRelativeTime } from "@/features/service-requests/format"

import { Stars } from "./components/Stars"
import { fetchPublicProfessional } from "./service"
import type { PublicProfessional } from "./types"

export function PublicProfessionalScreen({ id }: { id: string }) {
  const insets = useSafeAreaInsets()
  const [professional, setProfessional] = useState<PublicProfessional | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async () => {
    setIsLoading(true)
    setError(null)

    const result = await fetchPublicProfessional(id)

    if (result.ok) {
      setProfessional(result.data)
    } else {
      setError(result.error)
    }

    setIsLoading(false)
  }, [id])

  useEffect(() => {
    void load()
  }, [load])

  return (
    <View style={styles.screen}>
      <View style={[styles.header, { paddingTop: insets.top + 12 }]}>
        <Pressable
          accessibilityLabel="Voltar"
          accessibilityRole="button"
          hitSlop={8}
          onPress={() => router.back()}
          style={({ pressed }) => [styles.backButton, pressed && styles.pressed]}
        >
          <Ionicons color={colors.textPrimary} name="chevron-back" size={22} />
        </Pressable>
        <Text style={styles.headerTitle}>Perfil do profissional</Text>
      </View>

      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        {renderBody()}
      </ScrollView>
    </View>
  )

  function renderBody() {
    if (isLoading && !professional) {
      return (
        <View style={styles.centered}>
          <ActivityIndicator color={colors.accent} />
        </View>
      )
    }

    if (!professional) {
      return (
        <View style={styles.centered}>
          <Text style={styles.errorText}>{error ?? "Não foi possível carregar o perfil."}</Text>
          <Button label="Tentar novamente" onPress={load} style={styles.retry} variant="secondary" />
        </View>
      )
    }

    const ratingLabel =
      professional.ratingCount > 0
        ? `${professional.ratingAverage.toFixed(1)} (${professional.ratingCount} ${
            professional.ratingCount === 1 ? "avaliação" : "avaliações"
          })`
        : "Novo profissional"

    return (
      <>
        <View style={styles.headerCard}>
          {professional.avatarUrl ? (
            <Image source={{ uri: professional.avatarUrl }} style={styles.avatar} />
          ) : (
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>{getInitials(professional.name)}</Text>
            </View>
          )}
          <Text style={styles.name}>{professional.name}</Text>
          <Text style={styles.mainCategory}>
            {professional.mainCategory ?? "Categoria não definida"}
          </Text>
          <View style={styles.ratingRow}>
            <Stars rating={professional.ratingCount > 0 ? professional.ratingAverage : 0} size={16} />
            <Text style={styles.ratingLabel}>{ratingLabel}</Text>
          </View>
        </View>

        <View style={styles.statsRow}>
          <StatBox
            label={professional.stats.servicesCompleted === 1 ? "serviço concluído" : "serviços concluídos"}
            value={String(professional.stats.servicesCompleted)}
          />
          <View style={styles.statDivider} />
          <StatBox
            label={professional.ratingCount === 1 ? "avaliação" : "avaliações"}
            value={String(professional.ratingCount)}
          />
        </View>

        {professional.bio ? (
          <Section title="Sobre">
            <Text style={styles.bio}>{professional.bio}</Text>
          </Section>
        ) : null}

        <Section title="Categorias atendidas">
          <Chips
            emptyText="Nenhuma categoria informada."
            items={professional.categories.map((category) => category.name)}
          />
        </Section>

        <Section title="Cidades atendidas">
          <Chips
            emptyText="Nenhuma cidade informada."
            items={professional.cities.map((city) => `${city.name}, ${city.state}`)}
          />
        </Section>

        <Section title="Avaliações dos clientes">
          {professional.reviews.length === 0 ? (
            <Text style={styles.emptyReviews}>Este profissional ainda não recebeu avaliações.</Text>
          ) : (
            <View style={styles.reviews}>
              {professional.reviews.map((review) => (
                <View key={review.id} style={styles.reviewItem}>
                  <View style={styles.reviewHeader}>
                    <Text style={styles.reviewName}>{review.reviewerName}</Text>
                    <Stars rating={review.rating} size={13} />
                  </View>
                  <Text style={styles.reviewMeta}>
                    {review.serviceCategory} · {formatRelativeTime(review.createdAt)}
                  </Text>
                  {review.comment ? (
                    <Text style={styles.reviewComment}>{review.comment}</Text>
                  ) : null}
                </View>
              ))}
            </View>
          )}
        </Section>
      </>
    )
  }
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>{title}</Text>
      <View style={styles.sectionBody}>{children}</View>
    </View>
  )
}

function StatBox({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.statBox}>
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  )
}

function Chips({ items, emptyText }: { items: string[]; emptyText: string }) {
  if (items.length === 0) {
    return <Text style={styles.chipsEmpty}>{emptyText}</Text>
  }

  return (
    <View style={styles.chips}>
      {items.map((item) => (
        <View key={item} style={styles.chip}>
          <Text style={styles.chipText}>{item}</Text>
        </View>
      ))}
    </View>
  )
}

const styles = StyleSheet.create({
  avatar: {
    alignItems: "center",
    backgroundColor: colors.avatarBg,
    borderRadius: radius.avatar,
    height: 76,
    justifyContent: "center",
    width: 76,
  },
  avatarText: {
    color: colors.avatarText,
    fontSize: 26,
    fontWeight: "700",
  },
  backButton: {
    alignItems: "center",
    backgroundColor: colors.iconMutedBg,
    borderRadius: 999,
    height: 40,
    justifyContent: "center",
    width: 40,
  },
  bio: {
    color: colors.textSecondary,
    fontSize: 15,
    lineHeight: 22,
  },
  centered: {
    alignItems: "center",
    gap: 14,
    paddingVertical: 60,
  },
  chip: {
    backgroundColor: colors.accentSoftBg,
    borderRadius: radius.chip,
    paddingHorizontal: 12,
    paddingVertical: 7,
  },
  chipText: {
    color: colors.accent,
    fontSize: 13,
    fontWeight: "500",
  },
  chips: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  chipsEmpty: {
    color: colors.textSecondary,
    fontSize: 14,
  },
  content: {
    gap: 16,
    paddingBottom: 40,
    paddingHorizontal: spacing.screen,
    paddingTop: 8,
  },
  emptyReviews: {
    color: colors.textSecondary,
    fontSize: 14,
    lineHeight: 20,
  },
  errorText: {
    color: colors.textSecondary,
    fontSize: 14,
    textAlign: "center",
  },
  header: {
    alignItems: "center",
    backgroundColor: colors.screenBg,
    flexDirection: "row",
    gap: 12,
    paddingBottom: 12,
    paddingHorizontal: spacing.screen,
  },
  headerCard: {
    alignItems: "center",
    backgroundColor: colors.surface,
    borderColor: colors.cardBorder,
    borderRadius: radius.card,
    borderWidth: 1,
    gap: 6,
    paddingHorizontal: 20,
    paddingVertical: 24,
  },
  headerTitle: {
    color: colors.textPrimary,
    fontSize: 20,
    fontWeight: "700",
  },
  mainCategory: {
    color: colors.accent,
    fontSize: 15,
    fontWeight: "600",
  },
  name: {
    color: colors.textPrimary,
    fontSize: 22,
    fontWeight: "700",
    marginTop: 6,
    textAlign: "center",
  },
  pressed: {
    opacity: 0.7,
  },
  ratingLabel: {
    color: colors.textSecondary,
    fontSize: 14,
  },
  ratingRow: {
    alignItems: "center",
    flexDirection: "row",
    gap: 8,
    marginTop: 4,
  },
  retry: {
    paddingHorizontal: 24,
  },
  reviewComment: {
    color: colors.textSecondary,
    fontSize: 14,
    lineHeight: 20,
  },
  reviewHeader: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
  },
  reviewItem: {
    borderTopColor: colors.cardBorder,
    borderTopWidth: StyleSheet.hairlineWidth,
    gap: 4,
    paddingTop: 12,
  },
  reviewMeta: {
    color: colors.textTertiary,
    fontSize: 12,
  },
  reviewName: {
    color: colors.textPrimary,
    fontSize: 14,
    fontWeight: "600",
  },
  reviews: {
    gap: 4,
  },
  screen: {
    backgroundColor: colors.screenBg,
    flex: 1,
  },
  section: {
    backgroundColor: colors.surface,
    borderColor: colors.cardBorder,
    borderRadius: radius.card,
    borderWidth: 1,
    gap: 10,
    padding: spacing.card,
  },
  sectionBody: {
    gap: 6,
  },
  sectionTitle: {
    color: colors.textPrimary,
    fontSize: 15,
    fontWeight: "700",
  },
  statBox: {
    alignItems: "center",
    flex: 1,
    gap: 2,
  },
  statDivider: {
    backgroundColor: colors.cardBorder,
    width: 1,
  },
  statLabel: {
    color: colors.textSecondary,
    fontSize: 12,
    textAlign: "center",
  },
  statValue: {
    color: colors.textPrimary,
    fontSize: 20,
    fontWeight: "700",
  },
  statsRow: {
    backgroundColor: colors.surface,
    borderColor: colors.cardBorder,
    borderRadius: radius.card,
    borderWidth: 1,
    flexDirection: "row",
    paddingHorizontal: 12,
    paddingVertical: 16,
  },
})
