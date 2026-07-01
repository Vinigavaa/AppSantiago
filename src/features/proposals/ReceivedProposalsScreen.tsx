import { Ionicons } from "@expo/vector-icons"
import { type Href, router } from "expo-router"
import { useState } from "react"
import {
  ActivityIndicator,
  Alert,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native"
import { useSafeAreaInsets } from "react-native-safe-area-context"

import { routes } from "@/constants/routes"
import { EmptyState } from "@/features/client-home/components/EmptyState"
import { colors, spacing } from "@/features/client-home/theme"

import { ReceivedProposalCard } from "./components/ReceivedProposalCard"
import { useReceivedProposals } from "./hooks"
import { acceptProposal, rejectProposal } from "./service"
import type { ReceivedProposal } from "./types"

export function ReceivedProposalsScreen() {
  const insets = useSafeAreaInsets()
  const { proposals, isLoading, isRefreshing, error, refetch, replaceProposal } =
    useReceivedProposals()

  const [processingId, setProcessingId] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)

  function showNotice(message: string) {
    setNotice(message)
    setTimeout(() => setNotice(null), 2500)
  }

  async function runAction(
    proposal: ReceivedProposal,
    action: (id: string) => ReturnType<typeof acceptProposal>,
    successMessage: string,
  ) {
    if (processingId) {
      return
    }

    setProcessingId(proposal.id)
    const result = await action(proposal.id)
    setProcessingId(null)

    if (result.ok) {
      replaceProposal(result.data)
      showNotice(successMessage)
    } else {
      Alert.alert("Não foi possível concluir", result.error)
      // Recarrega para refletir o estado real caso a proposta já tenha mudado.
      if (result.status === 409) {
        void refetch()
      }
    }
  }

  function handleAccept(proposal: ReceivedProposal) {
    Alert.alert(
      "Aceitar proposta",
      `Aceitar a proposta de ${proposal.professional.name}? A solicitação será contratada e não receberá novas propostas.`,
      [
        { text: "Cancelar", style: "cancel" },
        {
          text: "Aceitar",
          onPress: () => runAction(proposal, acceptProposal, "Proposta aceita."),
        },
      ],
    )
  }

  // Abre o perfil completo do profissional. Usa push para preservar a lista de
  // propostas na pilha — ao voltar, o cliente retorna exatamente onde estava.
  function handleOpenProfile(proposal: ReceivedProposal) {
    router.push(`${routes.professionalProfile}?id=${proposal.professional.id}` as Href)
  }

  function handleReject(proposal: ReceivedProposal) {
    Alert.alert("Recusar proposta", `Recusar a proposta de ${proposal.professional.name}?`, [
      { text: "Cancelar", style: "cancel" },
      {
        text: "Recusar",
        style: "destructive",
        onPress: () => runAction(proposal, rejectProposal, "Proposta recusada."),
      },
    ])
  }

  return (
    <View style={styles.screen}>
      <ScrollView
        contentContainerStyle={[styles.content, { paddingTop: insets.top + 12 }]}
        refreshControl={
          <RefreshControl onRefresh={refetch} refreshing={isRefreshing} tintColor={colors.accent} />
        }
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.title}>Propostas recebidas</Text>

        {renderBody()}
      </ScrollView>

      {notice ? (
        <View style={[styles.notice, { top: insets.top + 8 }]}>
          <Ionicons color="#FFFFFF" name="checkmark-circle" size={18} />
          <Text style={styles.noticeText}>{notice}</Text>
        </View>
      ) : null}
    </View>
  )

  function renderBody() {
    if (isLoading) {
      return (
        <View style={styles.centered}>
          <ActivityIndicator color={colors.accent} />
        </View>
      )
    }

    if (error && proposals.length === 0) {
      return (
        <EmptyState
          actionLabel="Tentar novamente"
          description={error}
          icon="cloud-offline-outline"
          onPressAction={refetch}
          title="Não foi possível carregar"
        />
      )
    }

    if (proposals.length === 0) {
      return (
        <EmptyState
          description="Quando profissionais enviarem propostas para suas solicitações, elas aparecerão aqui."
          icon="document-text-outline"
          title="Nenhuma proposta ainda"
        />
      )
    }

    return (
      <View style={styles.list}>
        {proposals.map((proposal) => (
          <ReceivedProposalCard
            busy={processingId === proposal.id}
            key={proposal.id}
            onAccept={handleAccept}
            onOpenProfile={handleOpenProfile}
            onReject={handleReject}
            proposal={proposal}
          />
        ))}
      </View>
    )
  }
}

const styles = StyleSheet.create({
  centered: {
    paddingVertical: 48,
  },
  content: {
    gap: 18,
    paddingBottom: 28,
    paddingHorizontal: spacing.screen,
  },
  list: {
    gap: spacing.cardGap,
  },
  notice: {
    alignItems: "center",
    alignSelf: "center",
    backgroundColor: colors.accent,
    borderRadius: 999,
    flexDirection: "row",
    gap: 8,
    paddingHorizontal: 16,
    paddingVertical: 10,
    position: "absolute",
  },
  noticeText: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "600",
  },
  screen: {
    backgroundColor: colors.screenBg,
    flex: 1,
  },
  title: {
    color: colors.textPrimary,
    fontSize: 24,
    fontWeight: "700",
  },
})
