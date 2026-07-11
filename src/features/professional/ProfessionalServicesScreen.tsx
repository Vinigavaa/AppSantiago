import { useLocalSearchParams } from "expo-router"
import { useEffect, useMemo, useState } from "react"
import { Alert, RefreshControl, ScrollView, StyleSheet, Text, View } from "react-native"
import { useSafeAreaInsets } from "react-native-safe-area-context"

import { LoadingState } from "@/components/ui/LoadingState"
import { EmptyState } from "@/features/client-home/components/EmptyState"
import { FilterChips } from "@/features/client-home/components/FilterChips"
import { colors, spacing } from "@/features/client-home/theme"
import { CancelServiceModal } from "@/features/contracts/CancelServiceModal"
import { ReviewModal } from "@/features/service-requests/components/ReviewModal"

import { RejectedProposalCard } from "./components/RejectedProposalCard"
import { ServiceCard } from "./components/ServiceCard"
import { useProfessionalServices, useRejectedProposals } from "./hooks"
import { completeService, startService } from "./service"
import type { ProfessionalService, ServiceContractStatus } from "./types"

// "Propostas recusadas" não é um status de contrato: mostra propostas que o
// cliente não aceitou. Os demais filtros mapeiam para status de contrato.
type FilterKey = ServiceContractStatus | "ALL" | "REJECTED"

const FILTERS: { key: FilterKey; label: string }[] = [
  { key: "ALL", label: "Todos" },
  { key: "ACCEPTED", label: "Contratados" },
  { key: "IN_PROGRESS", label: "Em andamento" },
  { key: "COMPLETED", label: "Concluídos" },
  { key: "REJECTED", label: "Propostas recusadas" },
]

const FILTER_LABELS = FILTERS.map((filter) => filter.label)

// Parâmetro de rota (vindo dos cartões do dashboard) -> filtro selecionado.
const PARAM_TO_LABEL: Record<string, string> = {
  accepted: "Contratados",
  in_progress: "Em andamento",
  completed: "Concluídos",
  rejected: "Propostas recusadas",
}

export function ProfessionalServicesScreen() {
  const insets = useSafeAreaInsets()
  const { services, isLoading, isRefreshing, error, refetch, replaceService } =
    useProfessionalServices()
  const {
    proposals: rejectedProposals,
    isLoading: rejectedLoading,
    isRefreshing: rejectedRefreshing,
    error: rejectedError,
    refetch: refetchRejected,
  } = useRejectedProposals()

  const { filter } = useLocalSearchParams<{ filter?: string }>()
  const [activeFilter, setActiveFilter] = useState(FILTER_LABELS[0]!)
  const [processingId, setProcessingId] = useState<string | null>(null)
  const [cancelId, setCancelId] = useState<string | null>(null)
  const [reviewClient, setReviewClient] = useState<ProfessionalService | null>(null)

  // Pré-seleciona o filtro quando a tela é aberta a partir de um cartão do dashboard.
  useEffect(() => {
    const label = filter ? PARAM_TO_LABEL[filter] : undefined
    if (label) {
      setActiveFilter(label)
    }
  }, [filter])

  const activeKey = FILTERS.find((item) => item.label === activeFilter)?.key ?? "ALL"
  const showingRejected = activeKey === "REJECTED"

  const visibleServices = useMemo(() => {
    if (activeKey === "ALL" || activeKey === "REJECTED") {
      return services
    }
    return services.filter((service) => service.status === activeKey)
  }, [services, activeKey])

  // Só há filtros a exibir quando existe algum conteúdo (serviços ou recusadas).
  const hasAnyContent = services.length > 0 || rejectedProposals.length > 0

  async function runAction(
    service: ProfessionalService,
    action: (id: string) => ReturnType<typeof startService>,
  ) {
    if (processingId) {
      return
    }

    setProcessingId(service.id)
    const result = await action(service.id)
    setProcessingId(null)

    if (result.ok) {
      replaceService(result.data)
    } else {
      Alert.alert("Não foi possível atualizar", result.error)
      // Estado pode ter mudado no servidor (ex.: já iniciado): recarrega.
      if (result.status === 409) {
        refetch()
      }
    }
  }

  function handleStart(service: ProfessionalService) {
    Alert.alert("Iniciar atendimento", "Confirmar o início deste serviço?", [
      { text: "Cancelar", style: "cancel" },
      { text: "Iniciar", onPress: () => runAction(service, startService) },
    ])
  }

  function handleComplete(service: ProfessionalService) {
    Alert.alert("Concluir serviço", "Confirmar a conclusão deste serviço?", [
      { text: "Cancelar", style: "cancel" },
      { text: "Concluir", onPress: () => runAction(service, completeService) },
    ])
  }

  return (
    <>
      <ScrollView
        contentContainerStyle={[styles.content, { paddingTop: insets.top + 12 }]}
        refreshControl={
          <RefreshControl
            onRefresh={showingRejected ? refetchRejected : refetch}
            refreshing={showingRejected ? rejectedRefreshing : isRefreshing}
            tintColor={colors.accent}
          />
        }
        showsVerticalScrollIndicator={false}
        style={styles.screen}
      >
        <Text style={styles.title}>Meus serviços</Text>

        {hasAnyContent ? (
          <ScrollView
            contentContainerStyle={styles.chipsContent}
            horizontal
            showsHorizontalScrollIndicator={false}
          >
            <FilterChips active={activeFilter} onSelect={setActiveFilter} options={FILTER_LABELS} />
          </ScrollView>
        ) : null}

        {renderBody()}
      </ScrollView>

      {cancelId ? (
        <CancelServiceModal
          contractId={cancelId}
          onCanceled={refetch}
          onClose={() => setCancelId(null)}
        />
      ) : null}

      {reviewClient ? (
        <ReviewModal
          contractId={reviewClient.id}
          onClose={() => setReviewClient(null)}
          onReviewed={refetch}
          subtitle={`Como foi atender ${reviewClient.client.name}?`}
          title="Avaliar cliente"
        />
      ) : null}
    </>
  )

  function renderBody() {
    if (showingRejected) {
      return renderRejected()
    }
    return renderServices()
  }

  function renderRejected() {
    if (rejectedLoading) {
      return <LoadingState />
    }

    if (rejectedError && rejectedProposals.length === 0) {
      return (
        <EmptyState
          actionLabel="Tentar novamente"
          description={rejectedError}
          icon="cloud-offline-outline"
          onPressAction={refetchRejected}
          title="Não foi possível carregar"
        />
      )
    }

    if (rejectedProposals.length === 0) {
      return (
        <EmptyState
          description="Quando um cliente não aceitar uma de suas propostas, ela aparecerá aqui como histórico."
          icon="close-circle-outline"
          title="Nenhuma proposta recusada"
        />
      )
    }

    return (
      <View style={styles.list}>
        {rejectedProposals.map((proposal) => (
          <RejectedProposalCard key={proposal.id} proposal={proposal} />
        ))}
      </View>
    )
  }

  function renderServices() {
    if (isLoading) {
      return <LoadingState />
    }

    if (error && services.length === 0) {
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

    if (services.length === 0) {
      return (
        <EmptyState
          description="Quando um cliente aceitar uma de suas propostas, o serviço aparecerá aqui — com o endereço e o contato liberados."
          icon="construct-outline"
          title="Nenhum serviço ainda"
        />
      )
    }

    if (visibleServices.length === 0) {
      return (
        <EmptyState
          description="Nenhum serviço neste status no momento."
          icon="filter-outline"
          title="Sem resultados"
        />
      )
    }

    return (
      <View style={styles.list}>
        {visibleServices.map((service) => (
          <ServiceCard
            busy={processingId === service.id}
            key={service.id}
            onCancel={(item) => setCancelId(item.id)}
            onComplete={handleComplete}
            onReviewClient={setReviewClient}
            onStart={handleStart}
            service={service}
          />
        ))}
      </View>
    )
  }
}

const styles = StyleSheet.create({
  chipsContent: {
    gap: 10,
  },
  content: {
    gap: 18,
    paddingBottom: 28,
    paddingHorizontal: spacing.screen,
  },
  list: {
    gap: spacing.cardGap,
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
