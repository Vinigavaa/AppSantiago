import { Ionicons } from "@expo/vector-icons"
import { type Href, router } from "expo-router"
import { useMemo, useState } from "react"
import { Alert, RefreshControl, ScrollView, StyleSheet, Text, View } from "react-native"
import { useSafeAreaInsets } from "react-native-safe-area-context"

import { LoadingState } from "@/components/ui/LoadingState"
import { routes } from "@/constants/routes"
import { EmptyState } from "@/features/client-home/components/EmptyState"
import { colors, spacing } from "@/features/client-home/theme"

import { AcceptedProposalCard } from "./components/AcceptedProposalCard"
import { ClosedProposalCard } from "./components/ClosedProposalCard"
import { ProposalTabs, type ProposalTabKey } from "./components/ProposalTabs"
import { ReceivedProposalCard } from "./components/ReceivedProposalCard"
import { useReceivedProposals } from "./hooks"
import { acceptProposal, rejectProposal } from "./service"
import type { ReceivedProposal } from "./types"

// Mensagem amigável para cada aba sem propostas.
const EMPTY_BY_TAB: Record<ProposalTabKey, { title: string; description: string }> = {
  pending: {
    title: "Nenhuma proposta pendente",
    description: "Você ainda não possui propostas aguardando decisão.",
  },
  accepted: {
    title: "Nenhuma proposta aceita",
    description: "Nenhuma proposta foi aceita até o momento.",
  },
  closed: {
    title: "Nenhuma proposta encerrada",
    description: "Nenhuma proposta recusada ou cancelada.",
  },
}

export function ReceivedProposalsScreen() {
  const insets = useSafeAreaInsets()
  const { proposals, isLoading, isRefreshing, error, refetch, replaceProposal } =
    useReceivedProposals()

  const [activeTab, setActiveTab] = useState<ProposalTabKey>("pending")
  const [processingId, setProcessingId] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)

  // Separa por status. Os contadores vêm da lista completa, então acompanham
  // qualquer mudança de status sem recarregar manualmente.
  const { pending, accepted, closed } = useMemo(() => {
    return {
      pending: proposals.filter((p) => p.status === "PENDING"),
      accepted: proposals.filter((p) => p.status === "ACCEPTED"),
      closed: proposals.filter((p) => p.status === "REJECTED" || p.status === "CANCELED"),
    }
  }, [proposals])

  const counts = { pending: pending.length, accepted: accepted.length, closed: closed.length }
  const visible = activeTab === "pending" ? pending : activeTab === "accepted" ? accepted : closed

  function showNotice(message: string) {
    setNotice(message)
    setTimeout(() => setNotice(null), 2500)
  }

  async function runAction(
    proposal: ReceivedProposal,
    action: (id: string) => ReturnType<typeof acceptProposal>,
    successMessage: string,
    // Aceitar recusa as demais pendentes no servidor, então recarrega para
    // manter as abas/contadores sincronizados; recusar altera só a própria.
    resync: "refetch" | "replace",
  ) {
    if (processingId) {
      return
    }

    setProcessingId(proposal.id)
    const result = await action(proposal.id)
    setProcessingId(null)

    if (result.ok) {
      if (resync === "refetch") {
        void refetch()
      } else {
        replaceProposal(result.data)
      }
      showNotice(successMessage)
    } else {
      Alert.alert("Não foi possível concluir", result.error)
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
          onPress: () => runAction(proposal, acceptProposal, "Proposta aceita.", "refetch"),
        },
      ],
    )
  }

  function handleReject(proposal: ReceivedProposal) {
    Alert.alert("Recusar proposta", `Recusar a proposta de ${proposal.professional.name}?`, [
      { text: "Cancelar", style: "cancel" },
      {
        text: "Recusar",
        style: "destructive",
        onPress: () => runAction(proposal, rejectProposal, "Proposta recusada.", "replace"),
      },
    ])
  }

  // Navegações preservam a aba atual: a tela permanece montada, então ao voltar
  // o usuário retorna exatamente onde estava.
  function handleOpenProfile(proposal: ReceivedProposal) {
    router.push(`${routes.professionalProfile}?id=${proposal.professional.id}` as Href)
  }

  function handleOpenService(proposal: ReceivedProposal) {
    router.push(`${routes.requestDetails}?id=${proposal.serviceRequest.id}` as Href)
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

        {isLoading || (error && proposals.length === 0) ? null : (
          <ProposalTabs active={activeTab} counts={counts} onSelect={setActiveTab} />
        )}

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
      return <LoadingState />
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

    if (visible.length === 0) {
      const empty = EMPTY_BY_TAB[activeTab]
      return (
        <EmptyState description={empty.description} icon="document-text-outline" title={empty.title} />
      )
    }

    return <View style={styles.list}>{visible.map(renderCard)}</View>
  }

  function renderCard(proposal: ReceivedProposal) {
    if (activeTab === "pending") {
      return (
        <ReceivedProposalCard
          busy={processingId === proposal.id}
          key={proposal.id}
          onAccept={handleAccept}
          onOpenProfile={handleOpenProfile}
          onReject={handleReject}
          proposal={proposal}
        />
      )
    }

    if (activeTab === "accepted") {
      return (
        <AcceptedProposalCard
          key={proposal.id}
          onOpenProfile={handleOpenProfile}
          onOpenService={handleOpenService}
          proposal={proposal}
        />
      )
    }

    return <ClosedProposalCard key={proposal.id} proposal={proposal} />
  }
}

const styles = StyleSheet.create({
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
