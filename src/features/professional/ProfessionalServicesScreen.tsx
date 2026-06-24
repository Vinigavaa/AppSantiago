import { useMemo, useState } from "react"
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

import { EmptyState } from "@/features/client-home/components/EmptyState"
import { FilterChips } from "@/features/client-home/components/FilterChips"
import { colors, spacing } from "@/features/client-home/theme"
import { CancelServiceModal } from "@/features/contracts/CancelServiceModal"

import { ServiceCard } from "./components/ServiceCard"
import { useProfessionalServices } from "./hooks"
import { completeService, startService } from "./service"
import type { ProfessionalService, ServiceContractStatus } from "./types"

// Filtros mapeados para os status de contrato. "Todos" não filtra.
const FILTERS: { label: string; status: ServiceContractStatus | null }[] = [
  { label: "Todos", status: null },
  { label: "Contratados", status: "ACCEPTED" },
  { label: "Em andamento", status: "IN_PROGRESS" },
  { label: "Concluídos", status: "COMPLETED" },
]

const FILTER_LABELS = FILTERS.map((filter) => filter.label)

export function ProfessionalServicesScreen() {
  const insets = useSafeAreaInsets()
  const { services, isLoading, isRefreshing, error, refetch, replaceService } =
    useProfessionalServices()
  const [activeFilter, setActiveFilter] = useState(FILTER_LABELS[0]!)
  const [processingId, setProcessingId] = useState<string | null>(null)
  const [cancelId, setCancelId] = useState<string | null>(null)

  const visibleServices = useMemo(() => {
    const status = FILTERS.find((filter) => filter.label === activeFilter)?.status ?? null
    return status ? services.filter((service) => service.status === status) : services
  }, [services, activeFilter])

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
          <RefreshControl onRefresh={refetch} refreshing={isRefreshing} tintColor={colors.accent} />
        }
        showsVerticalScrollIndicator={false}
        style={styles.screen}
      >
        <Text style={styles.title}>Meus serviços</Text>

        {services.length > 0 ? (
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
    </>
  )

  function renderBody() {
    if (isLoading) {
      return (
        <View style={styles.centered}>
          <ActivityIndicator color={colors.accent} />
        </View>
      )
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
            onStart={handleStart}
            service={service}
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
