import { type Href, router } from "expo-router"
import { useMemo, useState } from "react"
import { RefreshControl, ScrollView, StyleSheet, View } from "react-native"
import { useSafeAreaInsets } from "react-native-safe-area-context"

import { LoadingState } from "@/components/ui/LoadingState"
import { routes } from "@/constants/routes"
import { EmptyState } from "@/features/client-home/components/EmptyState"
import { FilterChips } from "@/features/client-home/components/FilterChips"
import { HomeHeader } from "@/features/client-home/components/HomeHeader"
import { RequestCard } from "@/features/client-home/components/RequestCard"
import { SearchBar } from "@/features/client-home/components/SearchBar"
import { SectionHeader } from "@/features/client-home/components/SectionHeader"
import { getFirstName, getGreeting, getInitials } from "@/features/client-home/greeting"
import { colors, spacing } from "@/features/client-home/theme"
import { useUnreadNotifications } from "@/features/notifications/hooks"
import type { ServiceRequest } from "@/features/service-requests/types"
import { authClient } from "@/lib/auth-client"

import { useOpportunities } from "./hooks"

const FILTERS = ["Todos", "Mais recentes", "Próximos de mim", "Maior orçamento"]

// Valor de referência para ordenar por orçamento (maior teto, depois piso).
function budgetValue(request: ServiceRequest): number {
  return request.budgetMax ?? request.budgetMin ?? 0
}

export function ProfessionalHome() {
  const { data: session } = authClient.useSession()
  const insets = useSafeAreaInsets()
  const { opportunities, hasCoverage, isLoading, isRefreshing, error, refetch } = useOpportunities()
  const { unreadCount } = useUnreadNotifications()

  const [search, setSearch] = useState("")
  const [activeFilter, setActiveFilter] = useState(FILTERS[0])

  const visibleOpportunities = useMemo(() => {
    const term = search.trim().toLowerCase()

    const filtered = term
      ? opportunities.filter((opportunity) =>
          [opportunity.title, opportunity.category.name, opportunity.city.name].some((field) =>
            field.toLowerCase().includes(term),
          ),
        )
      : opportunities

    if (activeFilter === "Maior orçamento") {
      return [...filtered].sort((a, b) => budgetValue(b) - budgetValue(a))
    }

    // "Mais recentes" e "Próximos de mim" mantêm a ordem do servidor (createdAt
    // desc; as oportunidades já vêm restritas às cidades atendidas).
    return filtered
  }, [opportunities, search, activeFilter])

  function goToDetails(id: string) {
    router.push(`${routes.opportunityDetails}?id=${id}` as Href)
  }

  return (
    <ScrollView
      contentContainerStyle={[styles.content, { paddingTop: insets.top + 12 }]}
      refreshControl={
        <RefreshControl onRefresh={refetch} refreshing={isRefreshing} tintColor={colors.accent} />
      }
      showsVerticalScrollIndicator={false}
      style={styles.screen}
    >
      <HomeHeader
        greeting={getGreeting()}
        initials={getInitials(session?.user.name)}
        name={getFirstName(session?.user.name)}
        onPressAvatar={() => router.push(routes.profile)}
        onPressNotifications={() => router.push(routes.notifications)}
        unreadCount={unreadCount}
      />

      <View style={styles.searchBlock}>
        <SearchBar onChangeText={setSearch} placeholder="Buscar serviços" value={search} />
        <ScrollView
          contentContainerStyle={styles.chipsContent}
          horizontal
          showsHorizontalScrollIndicator={false}
        >
          <FilterChips active={activeFilter} onSelect={setActiveFilter} options={FILTERS} />
        </ScrollView>
      </View>

      <View>
        <SectionHeader title="Serviços disponíveis" />
        <View style={styles.listBlock}>{renderOpportunities()}</View>
      </View>
    </ScrollView>
  )

  function renderOpportunities() {
    if (isLoading) {
      return <LoadingState />
    }

    if (error && opportunities.length === 0) {
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

    if (opportunities.length === 0) {
      // Atuação ainda não configurada: orienta e leva direto ao perfil.
      if (!hasCoverage) {
        return (
          <EmptyState
            actionLabel="Configurar minha atuação"
            description="Defina as categorias de serviço e as cidades onde deseja trabalhar para começar a receber oportunidades compatíveis com seu perfil."
            icon="options-outline"
            onPressAction={() => router.push(routes.profile)}
            title="Você ainda não configurou sua área de atuação"
          />
        )
      }

      // Atuação configurada, mas sem solicitações compatíveis no momento.
      return (
        <EmptyState
          description="No momento não existem solicitações compatíveis com sua área de atuação. Novas oportunidades aparecerão automaticamente assim que forem criadas."
          icon="briefcase-outline"
          title="Nenhuma oportunidade encontrada"
        />
      )
    }

    if (visibleOpportunities.length === 0) {
      return (
        <EmptyState
          description="Nenhuma oportunidade corresponde à sua busca."
          icon="search-outline"
          title="Sem resultados"
        />
      )
    }

    return (
      <View style={styles.cardList}>
        {visibleOpportunities.map((opportunity) => (
          <RequestCard
            key={opportunity.id}
            onPress={() => goToDetails(opportunity.id)}
            request={opportunity}
          />
        ))}
      </View>
    )
  }
}

const styles = StyleSheet.create({
  cardList: {
    gap: spacing.cardGap,
  },
  chipsContent: {
    gap: 10,
  },
  content: {
    gap: 20,
    paddingBottom: 28,
    paddingHorizontal: spacing.screen,
  },
  listBlock: {
    marginTop: 14,
  },
  screen: {
    backgroundColor: colors.screenBg,
    flex: 1,
  },
  searchBlock: {
    gap: 14,
  },
})
