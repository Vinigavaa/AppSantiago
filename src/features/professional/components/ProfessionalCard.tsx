import { Ionicons } from "@expo/vector-icons"
import { Pressable, StyleSheet, Text, View } from "react-native"

import { ChatAvatar } from "@/features/chat/components/ChatAvatar"
import { colors, radius, spacing } from "@/features/client-home/theme"

import type { ProfessionalSummary } from "../types"
import { Stars } from "@/components/ui/Stars"

type IoniconName = keyof typeof Ionicons.glyphMap

// Selo de destaque calculado a partir de dados reais do profissional. No máximo
// um por cartão: "Bem avaliado" tem prioridade sobre "Experiente".
function badgeFor(professional: ProfessionalSummary): { label: string; icon: IoniconName } | null {
  if (professional.ratingCount >= 3 && professional.ratingAverage >= 4.5) {
    return { label: "Bem avaliado", icon: "ribbon-outline" }
  }
  if ((professional.experience ?? 0) >= 5 || professional.servicesCompleted >= 10) {
    return { label: "Experiente", icon: "shield-checkmark-outline" }
  }
  return null
}

// Resume as cidades atendidas em texto curto: até duas + "+N" quando houver mais.
function citiesLabel(cities: ProfessionalSummary["cities"]): string {
  if (cities.length === 0) {
    return "Cidades não informadas"
  }
  const shown = cities.slice(0, 2).map((city) => `${city.name}, ${city.state}`)
  const rest = cities.length - shown.length
  return rest > 0 ? `${shown.join(" · ")} +${rest}` : shown.join(" · ")
}

// Cartão de profissional na busca. Informação suficiente para o cliente decidir
// abrir o perfil completo: identidade, reputação, atuação e uma prévia da bio.
export function ProfessionalCard({
  professional,
  onPress,
}: {
  professional: ProfessionalSummary
  onPress: () => void
}) {
  const badge = badgeFor(professional)
  const ratingLabel =
    professional.ratingCount > 0
      ? `${professional.ratingAverage.toFixed(1)} (${professional.ratingCount})`
      : "Novo"

  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => [styles.card, pressed && styles.pressed]}
    >
      <View style={styles.headerRow}>
        <ChatAvatar avatarUrl={professional.avatarUrl} name={professional.name} size={56} />
        <View style={styles.identity}>
          <View style={styles.nameRow}>
            <Text numberOfLines={1} style={styles.name}>
              {professional.name}
            </Text>
            {badge ? (
              <View style={styles.badge}>
                <Ionicons color={colors.accent} name={badge.icon} size={12} />
                <Text style={styles.badgeText}>{badge.label}</Text>
              </View>
            ) : null}
          </View>
          <Text numberOfLines={1} style={styles.mainCategory}>
            {professional.mainCategory ?? "Categoria não definida"}
          </Text>
          <View style={styles.ratingRow}>
            <Stars rating={professional.ratingCount > 0 ? professional.ratingAverage : 0} size={13} />
            <Text style={styles.ratingLabel}>{ratingLabel}</Text>
          </View>
        </View>
      </View>

      <View style={styles.metaRow}>
        <Ionicons color={colors.textTertiary} name="location-outline" size={14} />
        <Text numberOfLines={1} style={styles.metaText}>
          {citiesLabel(professional.cities)}
        </Text>
      </View>

      <View style={styles.metaRow}>
        <Ionicons color={colors.textTertiary} name="checkmark-done-outline" size={14} />
        <Text style={styles.metaText}>
          {professional.servicesCompleted}{" "}
          {professional.servicesCompleted === 1 ? "serviço concluído" : "serviços concluídos"}
        </Text>
      </View>

      {professional.bio ? (
        <Text numberOfLines={2} style={styles.bio}>
          {professional.bio}
        </Text>
      ) : null}
    </Pressable>
  )
}

const styles = StyleSheet.create({
  badge: {
    alignItems: "center",
    backgroundColor: colors.accentSoftBg,
    borderRadius: radius.chip,
    flexDirection: "row",
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  badgeText: {
    color: colors.accent,
    fontSize: 11,
    fontWeight: "700",
  },
  bio: {
    color: colors.textSecondary,
    fontSize: 14,
    lineHeight: 20,
  },
  card: {
    backgroundColor: colors.surface,
    borderColor: colors.cardBorder,
    borderRadius: radius.card,
    borderWidth: 1,
    gap: 10,
    padding: spacing.card,
  },
  headerRow: {
    flexDirection: "row",
    gap: 12,
  },
  identity: {
    flex: 1,
    gap: 3,
    justifyContent: "center",
  },
  mainCategory: {
    color: colors.accent,
    fontSize: 14,
    fontWeight: "600",
  },
  metaRow: {
    alignItems: "center",
    flexDirection: "row",
    gap: 6,
  },
  metaText: {
    color: colors.textSecondary,
    flexShrink: 1,
    fontSize: 13,
  },
  name: {
    color: colors.textPrimary,
    flexShrink: 1,
    fontSize: 17,
    fontWeight: "700",
  },
  nameRow: {
    alignItems: "center",
    flexDirection: "row",
    gap: 8,
  },
  pressed: {
    opacity: 0.75,
  },
  ratingLabel: {
    color: colors.textSecondary,
    fontSize: 13,
  },
  ratingRow: {
    alignItems: "center",
    flexDirection: "row",
    gap: 6,
    marginTop: 1,
  },
})
