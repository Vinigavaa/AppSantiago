import { Ionicons } from "@expo/vector-icons"
import { router, useLocalSearchParams } from "expo-router"
import { useCallback, useEffect, useState } from "react"
import { ActivityIndicator, Alert, Pressable, ScrollView, StyleSheet, Text, View } from "react-native"
import { useSafeAreaInsets } from "react-native-safe-area-context"

import { LoadingState } from "@/components/ui/LoadingState"
import { ScreenHeader } from "@/components/ui/ScreenHeader"
import { EmptyState } from "@/features/client-home/components/EmptyState"
import { useStartChat } from "@/features/chat/hooks"
import { colors, radius, spacing } from "@/features/client-home/theme"
import {
  formatProposalPrice,
  getEstimatedDaysLabel,
  getProposalStatusStyle,
} from "@/features/proposals/format"
import { cancelProposal } from "@/features/proposals/service"
import type { OwnProposal } from "@/features/proposals/types"
import {
  formatBudget,
  formatRelativeTime,
  getStatusStyle,
  getUrgencyLabel,
} from "@/features/service-requests/format"
import type { ServiceRequest } from "@/features/service-requests/types"

import { ProposalFormModal } from "./components/ProposalFormModal"
import { Stars } from "@/components/ui/Stars"
import { fetchOpportunity } from "./service"
import type { OpportunityClient } from "./types"

export function OpportunityDetailsScreen() {
  const insets = useSafeAreaInsets()
  const { id } = useLocalSearchParams<{ id: string }>()

  const [opportunity, setOpportunity] = useState<ServiceRequest | null>(null)
  const [myProposal, setMyProposal] = useState<OwnProposal | null>(null)
  const [client, setClient] = useState<OpportunityClient | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [formOpen, setFormOpen] = useState(false)

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
      setOpportunity(result.data.opportunity)
      setMyProposal(result.data.myProposal)
      setClient(result.data.client)
    } else {
      setError(result.error)
    }

    setIsLoading(false)
  }, [id])

  useEffect(() => {
    void load()
  }, [load])

  const [isCanceling, setIsCanceling] = useState(false)

  // Reflete o envio na hora: registra a proposta e soma ao contador exibido.
  function handleSent(proposal: OwnProposal) {
    setMyProposal(proposal)
    setOpportunity((current) =>
      current ? { ...current, proposalsCount: current.proposalsCount + 1 } : current,
    )
  }

  function handleCancel() {
    if (!myProposal) {
      return
    }

    Alert.alert("Cancelar proposta", "Tem certeza que deseja cancelar esta proposta?", [
      { text: "Voltar", style: "cancel" },
      {
        text: "Cancelar proposta",
        style: "destructive",
        onPress: async () => {
          setIsCanceling(true)
          const result = await cancelProposal(myProposal.id)
          setIsCanceling(false)

          if (result.ok) {
            setMyProposal(result.data)
          } else {
            Alert.alert("Não foi possível cancelar", result.error)
          }
        },
      },
    ])
  }

  return (
    <View style={styles.screen}>
      <ScreenHeader onBack={() => router.back()} title="Detalhes da oportunidade" />

      {isLoading ? (
        <LoadingState />
      ) : error || !opportunity ? (
        <View style={styles.stateWrap}>
          <EmptyState
            actionLabel="Tentar novamente"
            description={error ?? "Não foi possível carregar."}
            icon="cloud-offline-outline"
            onPressAction={load}
            title="Não foi possível carregar"
          />
        </View>
      ) : (
        <Details
          client={client}
          insetsBottom={insets.bottom}
          isCanceling={isCanceling}
          myProposal={myProposal}
          onPressCancel={handleCancel}
          onPressSend={() => setFormOpen(true)}
          opportunity={opportunity}
        />
      )}

      {opportunity ? (
        <ProposalFormModal
          onClose={() => setFormOpen(false)}
          onSent={handleSent}
          serviceRequestId={opportunity.id}
          visible={formOpen}
        />
      ) : null}
    </View>
  )
}

function Details({
  opportunity,
  myProposal,
  client,
  insetsBottom,
  isCanceling,
  onPressSend,
  onPressCancel,
}: {
  opportunity: ServiceRequest
  myProposal: OwnProposal | null
  client: OpportunityClient | null
  insetsBottom: number
  isCanceling: boolean
  onPressSend: () => void
  onPressCancel: () => void
}) {
  const status = getStatusStyle(opportunity.status)
  const location = opportunity.neighborhood
    ? `${opportunity.neighborhood} · ${opportunity.city.name}, ${opportunity.city.state}`
    : `${opportunity.city.name}, ${opportunity.city.state}`

  // Só é possível enviar proposta enquanto a solicitação está aberta e não há
  // proposta enviada pelo profissional. A edição fica para um fluxo futuro.
  const canSend = opportunity.status === "OPEN" && !myProposal

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

      {client ? <ClientReputation client={client} /> : null}

      {myProposal ? (
        <SentProposalCard
          isCanceling={isCanceling}
          onPressCancel={onPressCancel}
          proposal={myProposal}
        />
      ) : canSend ? (
        <Pressable
          accessibilityRole="button"
          onPress={onPressSend}
          style={({ pressed }) => [styles.cta, pressed && styles.pressed]}
        >
          <Ionicons color="#FFFFFF" name="paper-plane-outline" size={18} />
          <Text style={styles.ctaText}>Enviar proposta</Text>
        </Pressable>
      ) : (
        <View style={styles.ctaDisabled}>
          <Text style={styles.ctaDisabledText}>
            Esta solicitação não está mais aberta para propostas.
          </Text>
        </View>
      )}
    </ScrollView>
  )
}

// Resumo da proposta já enviada pelo profissional.
function SentProposalCard({
  proposal,
  isCanceling,
  onPressCancel,
}: {
  proposal: OwnProposal
  isCanceling: boolean
  onPressCancel: () => void
}) {
  const status = getProposalStatusStyle(proposal.status)

  return (
    <View style={styles.sentCard}>
      <View style={styles.sentHeader}>
        <Text style={styles.sentTitle}>Sua proposta</Text>
        <View style={[styles.statusPill, { backgroundColor: status.background }]}>
          <Text style={[styles.statusText, { color: status.color }]}>{status.label}</Text>
        </View>
      </View>

      <View style={styles.sentMetrics}>
        <View style={styles.sentMetric}>
          <Text style={styles.sentLabel}>Valor</Text>
          <Text style={styles.sentValue}>{formatProposalPrice(proposal.price)}</Text>
        </View>
        <View style={styles.sentMetric}>
          <Text style={styles.sentLabel}>Prazo</Text>
          <Text style={styles.sentValue}>{getEstimatedDaysLabel(proposal.estimatedDays)}</Text>
        </View>
      </View>

      <Text style={styles.sentMessage}>{proposal.message}</Text>
      <Text style={styles.sentDate}>Enviada {formatRelativeTime(proposal.createdAt)}</Text>

      {proposal.status === "PENDING" ? (
        <Pressable
          accessibilityRole="button"
          disabled={isCanceling}
          onPress={onPressCancel}
          style={({ pressed }) => [styles.cancelButton, pressed && styles.pressed]}
        >
          {isCanceling ? (
            <ActivityIndicator color={colors.danger} size="small" />
          ) : (
            <Text style={styles.cancelText}>Cancelar proposta</Text>
          )}
        </Pressable>
      ) : null}
    </View>
  )
}

// Reputação do cliente que abriu a solicitação — dá confiança antes de propor.
// Permite também iniciar uma conversa para esclarecer detalhes antes da proposta.
function ClientReputation({ client }: { client: OpportunityClient }) {
  const { start, isStarting } = useStartChat()
  const ratingLabel =
    client.ratingCount > 0
      ? `${client.ratingAverage.toFixed(1)} (${client.ratingCount} ${
          client.ratingCount === 1 ? "avaliação" : "avaliações"
        })`
      : "Cliente sem avaliações ainda"

  return (
    <View style={styles.clientCard}>
      <Text style={styles.sectionTitle}>Reputação do cliente</Text>
      <View style={styles.clientHeader}>
        <Text style={styles.clientName}>{client.name}</Text>
        <View style={styles.clientRatingRow}>
          <Stars rating={client.ratingCount > 0 ? client.ratingAverage : 0} size={14} />
          <Text style={styles.clientRatingLabel}>{ratingLabel}</Text>
        </View>
      </View>

      <Pressable
        accessibilityRole="button"
        disabled={isStarting}
        onPress={() => start(client.userId)}
        style={({ pressed }) => [styles.chatClientButton, pressed && styles.pressed]}
      >
        {isStarting ? (
          <ActivityIndicator color={colors.accent} size="small" />
        ) : (
          <>
            <Ionicons color={colors.accent} name="chatbubble-ellipses-outline" size={16} />
            <Text style={styles.chatClientText}>Conversar com o cliente</Text>
          </>
        )}
      </Pressable>
    </View>
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
  cancelButton: {
    alignItems: "center",
    borderColor: colors.danger,
    borderRadius: radius.tag,
    borderWidth: 1,
    paddingVertical: 11,
  },
  cancelText: {
    color: colors.danger,
    fontSize: 14,
    fontWeight: "600",
  },
  chatClientButton: {
    alignItems: "center",
    backgroundColor: colors.accentSoftBg,
    borderRadius: radius.search,
    flexDirection: "row",
    gap: 8,
    justifyContent: "center",
    minHeight: 44,
    paddingVertical: 11,
  },
  chatClientText: {
    color: colors.accent,
    fontSize: 14,
    fontWeight: "700",
  },
  clientCard: {
    backgroundColor: colors.surface,
    borderColor: colors.cardBorder,
    borderRadius: radius.card,
    borderWidth: 1,
    gap: 10,
    marginTop: 4,
    padding: spacing.card,
  },
  clientHeader: {
    gap: 4,
  },
  clientName: {
    color: colors.textPrimary,
    fontSize: 15,
    fontWeight: "700",
  },
  clientRatingLabel: {
    color: colors.textSecondary,
    fontSize: 13,
  },
  clientRatingRow: {
    alignItems: "center",
    flexDirection: "row",
    gap: 8,
  },
  content: {
    gap: 14,
    paddingHorizontal: spacing.screen,
    paddingTop: 8,
  },
  cta: {
    alignItems: "center",
    backgroundColor: colors.accent,
    borderRadius: radius.search,
    flexDirection: "row",
    gap: 8,
    justifyContent: "center",
    marginTop: 6,
    paddingVertical: 16,
  },
  ctaDisabled: {
    alignItems: "center",
    backgroundColor: colors.iconMutedBg,
    borderRadius: radius.search,
    marginTop: 6,
    paddingHorizontal: 16,
    paddingVertical: 16,
  },
  ctaDisabledText: {
    color: colors.textSecondary,
    fontSize: 14,
    textAlign: "center",
  },
  ctaText: {
    color: "#FFFFFF",
    fontSize: 15,
    fontWeight: "700",
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
  stateWrap: {
    paddingHorizontal: spacing.screen,
    paddingTop: 8,
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
  sentCard: {
    backgroundColor: colors.surface,
    borderColor: colors.accent,
    borderRadius: radius.card,
    borderWidth: 1,
    gap: 12,
    marginTop: 6,
    padding: spacing.card,
  },
  sentDate: {
    color: colors.textTertiary,
    fontSize: 12,
  },
  sentHeader: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
  },
  sentLabel: {
    color: colors.textSecondary,
    fontSize: 12,
  },
  sentMessage: {
    color: colors.textSecondary,
    fontSize: 14,
    lineHeight: 20,
  },
  sentMetric: {
    flex: 1,
    gap: 2,
  },
  sentMetrics: {
    flexDirection: "row",
    gap: 12,
  },
  sentTitle: {
    color: colors.textPrimary,
    fontSize: 16,
    fontWeight: "700",
  },
  sentValue: {
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
