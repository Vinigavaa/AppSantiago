import { Ionicons } from "@expo/vector-icons"
import { Image, Pressable, StyleSheet, Text, View } from "react-native"

import { getInitials } from "@/features/client-home/greeting"
import { colors, radius, spacing } from "@/features/client-home/theme"
import { formatFullDate } from "@/features/service-requests/format"

import { formatProposalPrice, getServiceStatusStyle } from "../format"
import type { ReceivedProposal } from "../types"

type Props = {
  proposal: ReceivedProposal
  onOpenProfile: (proposal: ReceivedProposal) => void
  onOpenService: (proposal: ReceivedProposal) => void
}

// Card da aba "Aceitas": profissional contratado, valor e data da contratação,
// status atual do serviço e o atalho "Ver serviço". O perfil do profissional é
// aberto ao tocar na foto.
export function AcceptedProposalCard({ proposal, onOpenProfile, onOpenService }: Props) {
  const { professional, contract } = proposal
  const serviceStatus = getServiceStatusStyle(contract?.status ?? "ACCEPTED")

  return (
    <View style={styles.card}>
      <View style={styles.header}>
        <Pressable
          accessibilityHint="Abre o perfil completo do profissional"
          accessibilityRole="button"
          onPress={() => onOpenProfile(proposal)}
          style={({ pressed }) => pressed && styles.pressed}
        >
          {professional.avatarUrl ? (
            <Image source={{ uri: professional.avatarUrl }} style={styles.avatar} />
          ) : (
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>{getInitials(professional.name)}</Text>
            </View>
          )}
        </Pressable>

        <View style={styles.headerText}>
          <View style={styles.contractedRow}>
            <Ionicons color={colors.accent} name="checkmark-circle" size={15} />
            <Text style={styles.contracted}>Profissional contratado</Text>
          </View>
          <Text style={styles.name}>{professional.name}</Text>
        </View>

        <View style={[styles.statusPill, { backgroundColor: serviceStatus.background }]}>
          <Text style={[styles.statusText, { color: serviceStatus.color }]}>
            {serviceStatus.label}
          </Text>
        </View>
      </View>

      <Text numberOfLines={1} style={styles.serviceTitle}>
        {proposal.serviceRequest.category} · {proposal.serviceRequest.title}
      </Text>

      <View style={styles.metrics}>
        <View style={styles.metric}>
          <Text style={styles.metricLabel}>Valor contratado</Text>
          <Text style={styles.metricValue}>{formatProposalPrice(proposal.price)}</Text>
        </View>
        <View style={styles.metricDivider} />
        <View style={styles.metric}>
          <Text style={styles.metricLabel}>Contratado em</Text>
          <Text style={styles.metricValue}>
            {contract ? formatFullDate(contract.acceptedAt) : "—"}
          </Text>
        </View>
      </View>

      <Pressable
        onPress={() => onOpenService(proposal)}
        style={({ pressed }) => [styles.primaryAction, pressed && styles.pressed]}
      >
        <Ionicons color="#FFFFFF" name="construct-outline" size={16} />
        <Text style={styles.primaryText}>Ver serviço</Text>
      </Pressable>
    </View>
  )
}

const styles = StyleSheet.create({
  avatar: {
    alignItems: "center",
    backgroundColor: colors.avatarBg,
    borderRadius: radius.avatar,
    height: 44,
    justifyContent: "center",
    width: 44,
  },
  avatarText: {
    color: colors.avatarText,
    fontSize: 16,
    fontWeight: "700",
  },
  card: {
    backgroundColor: colors.surface,
    borderColor: colors.cardBorder,
    borderRadius: radius.card,
    borderWidth: 1,
    gap: 12,
    padding: spacing.card,
  },
  contracted: {
    color: colors.accent,
    fontSize: 12,
    fontWeight: "600",
  },
  contractedRow: {
    alignItems: "center",
    flexDirection: "row",
    gap: 4,
  },
  header: {
    alignItems: "center",
    flexDirection: "row",
    gap: 12,
  },
  headerText: {
    flex: 1,
    gap: 2,
  },
  metric: {
    flex: 1,
    gap: 2,
  },
  metricDivider: {
    backgroundColor: colors.cardBorder,
    width: 1,
  },
  metricLabel: {
    color: colors.textSecondary,
    fontSize: 12,
  },
  metricValue: {
    color: colors.textPrimary,
    fontSize: 15,
    fontWeight: "700",
  },
  metrics: {
    backgroundColor: colors.screenBg,
    borderRadius: radius.tag,
    flexDirection: "row",
    gap: 12,
    padding: 12,
  },
  name: {
    color: colors.textPrimary,
    fontSize: 16,
    fontWeight: "700",
  },
  pressed: {
    opacity: 0.85,
  },
  primaryAction: {
    alignItems: "center",
    backgroundColor: colors.accent,
    borderRadius: radius.search,
    flexDirection: "row",
    gap: 8,
    justifyContent: "center",
    paddingVertical: 13,
  },
  primaryText: {
    color: "#FFFFFF",
    fontSize: 15,
    fontWeight: "700",
  },
  serviceTitle: {
    color: colors.textSecondary,
    fontSize: 13,
    fontWeight: "500",
  },
  statusPill: {
    borderRadius: radius.tag,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  statusText: {
    fontSize: 12,
    fontWeight: "600",
  },
})
