import { Ionicons } from "@expo/vector-icons"
import { Pressable, StyleSheet, Text, View } from "react-native"

import { formatBudget, formatRelativeTime, getStatusStyle } from "@/features/service-requests/format"
import type { ServiceRequest } from "@/features/service-requests/types"

import { colors, radius, spacing } from "../theme"

type Props = {
  request: ServiceRequest
  onPress: () => void
}

export function RequestCard({ request, onPress }: Props) {
  const status = getStatusStyle(request.status)
  const location = request.neighborhood
    ? `${request.neighborhood} · ${request.city.name}, ${request.city.state}`
    : `${request.city.name}, ${request.city.state}`

  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => [styles.card, pressed && styles.pressed]}
    >
      <View style={styles.topRow}>
        <View style={styles.tag}>
          <Text style={styles.tagText}>{request.category.name}</Text>
        </View>
        <Text style={styles.time}>{formatRelativeTime(request.createdAt)}</Text>
      </View>

      <Text numberOfLines={2} style={styles.title}>
        {request.title}
      </Text>

      <View style={styles.locationRow}>
        <Ionicons color={colors.textSecondary} name="location-outline" size={15} />
        <Text numberOfLines={1} style={styles.locationText}>
          {location}
        </Text>
      </View>

      <View style={styles.footer}>
        <View style={styles.proposals}>
          <View style={styles.dot} />
          <Text style={styles.proposalsText}>
            {request.proposalsCount}{" "}
            {request.proposalsCount === 1 ? "proposta" : "propostas"}
          </Text>
        </View>
        <Text style={styles.price}>{formatBudget(request.budgetMin, request.budgetMax)}</Text>
      </View>

      <View style={[styles.statusPill, { backgroundColor: status.background }]}>
        <Text style={[styles.statusText, { color: status.color }]}>{status.label}</Text>
      </View>
    </Pressable>
  )
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderColor: colors.cardBorder,
    borderRadius: radius.card,
    borderWidth: 1,
    padding: spacing.card,
  },
  dot: {
    backgroundColor: colors.accent,
    borderRadius: 999,
    height: 8,
    width: 8,
  },
  footer: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 12,
  },
  locationRow: {
    alignItems: "center",
    flexDirection: "row",
    gap: 5,
    marginTop: 8,
  },
  locationText: {
    color: colors.textSecondary,
    flexShrink: 1,
    fontSize: 14,
  },
  price: {
    color: colors.accent,
    fontSize: 15,
    fontWeight: "600",
  },
  pressed: {
    opacity: 0.85,
  },
  proposals: {
    alignItems: "center",
    flexDirection: "row",
    gap: 7,
  },
  proposalsText: {
    color: colors.textSecondary,
    fontSize: 14,
  },
  statusPill: {
    alignSelf: "flex-start",
    borderRadius: radius.tag,
    marginTop: 12,
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
    fontSize: 17,
    fontWeight: "600",
    marginTop: 12,
  },
  topRow: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
  },
})
