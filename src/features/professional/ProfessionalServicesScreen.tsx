import { useMemo, useState } from "react"
import { ActivityIndicator, RefreshControl, ScrollView, StyleSheet, Text, View } from "react-native"
import { useSafeAreaInsets } from "react-native-safe-area-context"

import { EmptyState } from "@/features/client-home/components/EmptyState"
import { FilterChips } from "@/features/client-home/components/FilterChips"
import { colors, spacing } from "@/features/client-home/theme"

import { ServiceCard } from "./components/ServiceCard"
import { useProfessionalServices } from "./hooks"
import type { ServiceContractStatus } from "./types"

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
  const { services, isLoading, isRefreshing, error, refetch } = useProfessionalServices()
  const [activeFilter, setActiveFilter] = useState(FILTER_LABELS[0]!)

  const visibleServices = useMemo(() => {
    const status = FILTERS.find((filter) => filter.label === activeFilter)?.status ?? null
    return status ? services.filter((service) => service.status === status) : services
  }, [services, activeFilter])

  return (
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
          <ServiceCard key={service.id} service={service} />
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
