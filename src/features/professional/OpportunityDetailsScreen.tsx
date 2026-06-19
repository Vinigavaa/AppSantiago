import { Ionicons } from "@expo/vector-icons"
import { router, useLocalSearchParams } from "expo-router"
import { useCallback, useEffect, useState } from "react"
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native"
import { useSafeAreaInsets } from "react-native-safe-area-context"

import { colors, radius, spacing } from "@/features/client-home/theme"
import {
  formatBudget,
  formatRelativeTime,
  getStatusStyle,
  getUrgencyLabel,
} from "@/features/service-requests/format"
import type { ServiceRequest } from "@/features/service-requests/types"

import { fetchOpportunity } from "./service"

export function OpportunityDetailsScreen() {
  const insets = useSafeAreaInsets()
  const { id } = useLocalSearchParams<{ id: string }>()

  const [opportunity, setOpportunity] = useState<ServiceRequest | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async () => {
    if (!id) {
      setError("Solicitação inválida.")
      setIsLoading(false)
      return
    }

    setIsLoading(true)
    setError(null)

    const result = await fetchOpportunity(id)

    if (result.ok) {
      setOpportunity(result.data)
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
        <Text style={styles.headerTitle}>Detalhes da oportunidade</Text>
      </View>

      {isLoading ? (
        <View style={styles.centered}>
          <ActivityIndicator color={colors.accent} />
        </View>
      ) : error || !opportunity ? (
        <View style={styles.centered}>
          <Text style={styles.errorText}>{error ?? "Não foi possível carregar."}</Text>
          <Pressable
            accessibilityRole="button"
            onPress={load}
            style={({ pressed }) => [styles.retry, pressed && styles.pressed]}
          >
            <Text style={styles.retryText}>Tentar novamente</Text>
          </Pressable>
        </View>
      ) : (
        <Details insetsBottom={insets.bottom} opportunity={opportunity} />
      )}
    </View>
  )
}

function Details({
  opportunity,
  insetsBottom,
}: {
  opportunity: ServiceRequest
  insetsBottom: number
}) {
  const status = getStatusStyle(opportunity.status)
  const location = opportunity.neighborhood
    ? `${opportunity.neighborhood} · ${opportunity.city.name}, ${opportunity.city.state}`
    : `${opportunity.city.name}, ${opportunity.city.state}`

  return (
    <ScrollView
      contentContainerStyle={[styles.content, { paddingBottom: insetsBottom + 28 }]}
      showsVerticalScrollIndicator={false}
    >
      <View style={styles.topRow}>
        <View style={styles.tag}>
          <Text style={styles.tagText}>{opportunity.category.name}</Text>
        </View>
        <Text style={styles.time}>{formatRelativeTime(opportunity.createdAt)}</Text>
      </View>

      <Text style={styles.title}>{opportunity.title}</Text>

      <View style={[styles.statusPill, { backgroundColor: status.background }]}>
        <Text style={[styles.statusText, { color: status.color }]}>{status.label}</Text>
      </View>

      <View style={styles.infoCard}>
        <InfoRow icon="location-outline" label="Localização" value={location} />
        <View style={styles.divider} />
        <InfoRow
          icon="cash-outline"
          label="Orçamento"
          value={formatBudget(opportunity.budgetMin, opportunity.budgetMax)}
        />
        <View style={styles.divider} />
        <InfoRow
          icon="time-outline"
          label="Prazo"
          value={getUrgencyLabel(opportunity.urgency)}
        />
        <View style={styles.divider} />
        <InfoRow
          icon="people-outline"
          label="Propostas recebidas"
          value={String(opportunity.proposalsCount)}
        />
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Descrição</Text>
        <Text style={styles.description}>{opportunity.description}</Text>
      </View>

      <Text style={styles.privacyNote}>
        O endereço completo é liberado apenas após a contratação.
      </Text>

      {/* Envio de proposta ainda não disponível — fluxo apenas preparado. */}
      <View style={styles.ctaDisabled}>
        <Text style={styles.ctaText}>Enviar proposta (em breve)</Text>
      </View>
    </ScrollView>
  )
}

function InfoRow({
  icon,
  label,
  value,
}: {
  icon: keyof typeof Ionicons.glyphMap
  label: string
  value: string
}) {
  return (
    <View style={styles.row}>
      <View style={styles.rowIcon}>
        <Ionicons color={colors.accent} name={icon} size={18} />
      </View>
      <View style={styles.rowText}>
        <Text style={styles.rowLabel}>{label}</Text>
        <Text style={styles.rowValue}>{value}</Text>
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  backButton: {
    alignItems: "center",
    backgroundColor: colors.iconMutedBg,
    borderRadius: 999,
    height: 40,
    justifyContent: "center",
    width: 40,
  },
  centered: {
    alignItems: "center",
    flex: 1,
    gap: 14,
    justifyContent: "center",
    paddingHorizontal: spacing.screen,
  },
  content: {
    gap: 14,
    paddingHorizontal: spacing.screen,
    paddingTop: 8,
  },
  ctaDisabled: {
    alignItems: "center",
    backgroundColor: colors.iconMutedBg,
    borderRadius: radius.search,
    marginTop: 6,
    paddingVertical: 16,
  },
  ctaText: {
    color: colors.textTertiary,
    fontSize: 15,
    fontWeight: "600",
  },
  description: {
    color: colors.textSecondary,
    fontSize: 15,
    lineHeight: 22,
  },
  divider: {
    backgroundColor: colors.cardBorder,
    height: 1,
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
  headerTitle: {
    color: colors.textPrimary,
    fontSize: 20,
    fontWeight: "700",
  },
  infoCard: {
    backgroundColor: colors.surface,
    borderColor: colors.cardBorder,
    borderRadius: radius.card,
    borderWidth: 1,
    marginTop: 4,
    overflow: "hidden",
  },
  pressed: {
    opacity: 0.7,
  },
  privacyNote: {
    color: colors.textTertiary,
    fontSize: 13,
    lineHeight: 18,
  },
  retry: {
    backgroundColor: colors.accentSoftBg,
    borderRadius: radius.search,
    paddingHorizontal: 20,
    paddingVertical: 12,
  },
  retryText: {
    color: colors.accent,
    fontSize: 14,
    fontWeight: "600",
  },
  row: {
    alignItems: "center",
    flexDirection: "row",
    gap: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  rowIcon: {
    alignItems: "center",
    backgroundColor: colors.accentSoftBg,
    borderRadius: radius.avatar,
    height: 36,
    justifyContent: "center",
    width: 36,
  },
  rowLabel: {
    color: colors.textSecondary,
    fontSize: 13,
  },
  rowText: {
    flexShrink: 1,
    gap: 2,
  },
  rowValue: {
    color: colors.textPrimary,
    fontSize: 15,
    fontWeight: "600",
  },
  screen: {
    backgroundColor: colors.screenBg,
    flex: 1,
  },
  section: {
    gap: 8,
    marginTop: 4,
  },
  sectionTitle: {
    color: colors.textPrimary,
    fontSize: 16,
    fontWeight: "700",
  },
  statusPill: {
    alignSelf: "flex-start",
    borderRadius: radius.tag,
    paddingHorizontal: 10,
    paddingVertical: 5,
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
  time: {
    color: colors.textTertiary,
    fontSize: 13,
  },
  title: {
    color: colors.textPrimary,
    fontSize: 22,
    fontWeight: "700",
  },
  topRow: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
  },
})
