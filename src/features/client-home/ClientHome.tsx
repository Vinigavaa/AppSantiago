import { type Href, router } from "expo-router"
import { useMemo, useState } from "react"
import { RefreshControl, ScrollView, StyleSheet, View } from "react-native"
import { useSafeAreaInsets } from "react-native-safe-area-context"

import { LoadingState } from "@/components/ui/LoadingState"
import { routes } from "@/constants/routes"
import { CreateRequestButton } from "@/features/client-home/components/CreateRequestButton"
import { EmptyState } from "@/features/client-home/components/EmptyState"
import { HomeHeader } from "@/features/client-home/components/HomeHeader"
import { RequestCard } from "@/features/client-home/components/RequestCard"
import { SearchBar } from "@/features/client-home/components/SearchBar"
import { SectionHeader } from "@/features/client-home/components/SectionHeader"
import { SegmentedTabs } from "@/features/client-home/components/SegmentedTabs"
import { SummaryCards } from "@/features/client-home/components/SummaryCards"
import { getFirstName, getGreeting, getInitials } from "@/features/client-home/greeting"
import { colors, spacing } from "@/features/client-home/theme"
import { CancelServiceModal } from "@/features/contracts/CancelServiceModal"
import { useUnreadNotifications } from "@/features/notifications/hooks"
import { ReviewModal } from "@/features/service-requests/components/ReviewModal"
import { useServiceRequests } from "@/features/service-requests/hooks"
import type { RequestContract, RequestStatus } from "@/features/service-requests/types"
import { authClient } from "@/lib/auth-client"

type RequestTabKey = "open" | "completed" | "canceled"

// Agrupa cada status em uma aba. "Em aberto" reúne tudo que ainda não foi
// finalizado; concluídas e canceladas ganham abas próprias (histórico).
function tabOfStatus(status: RequestStatus): RequestTabKey {
  if (status === "COMPLETED") return "completed"
  if (status === "CANCELED") return "canceled"
  return "open"
}

// Mensagem amigável para cada aba sem solicitações, evitando telas vazias.
const EMPTY_BY_TAB: Record<RequestTabKey, { title: string; description: string }> = {
  open: {
    title: "Nenhuma solicitação em aberto",
    description: "Você não tem solicitações aguardando ação no momento.",
  },
  completed: {
    title: "Nenhuma solicitação concluída",
    description: "Seus serviços finalizados aparecerão aqui.",
  },
  canceled: {
    title: "Nenhuma solicitação cancelada",
    description: "Solicitações canceladas aparecerão aqui.",
  },
}

export function ClientHome() {
  const { data: session } = authClient.useSession()
  const insets = useSafeAreaInsets()
  const { requests, summary, isLoading, isRefreshing, error, refetch } = useServiceRequests()
  const { unreadCount } = useUnreadNotifications()

  const [search, setSearch] = useState("")
  const [activeTab, setActiveTab] = useState<RequestTabKey>("open")
  const [reviewContract, setReviewContract] = useState<RequestContract | null>(null)
  const [cancelContractId, setCancelContractId] = useState<string | null>(null)

  // Contadores por aba, sobre a lista completa (independem da busca).
  const counts = useMemo(() => {
    const result: Record<RequestTabKey, number> = { open: 0, completed: 0, canceled: 0 }
    for (const request of requests) {
      result[tabOfStatus(request.status)] += 1
    }
    return result
  }, [requests])

  // Lista visível: solicitações da aba ativa que também casam com a busca.
  const visibleRequests = useMemo(() => {
    const term = search.trim().toLowerCase()
    return requests.filter((request) => {
      if (tabOfStatus(request.status) !== activeTab) {
        return false
      }
      if (!term) {
        return true
      }
      return [request.title, request.category.name, request.city.name].some((field) =>
        field.toLowerCase().includes(term),
      )
    })
  }, [requests, search, activeTab])

  function goToCreateRequest() {
    router.push(routes.newRequest)
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
        <SearchBar onChangeText={setSearch} value={search} />
      </View>

      <CreateRequestButton onPress={goToCreateRequest} />

      <SummaryCards summary={summary} />

      <View>
        <SectionHeader title="Minhas solicitações" />
        {requests.length > 0 ? (
          <View style={styles.tabsBlock}>
            <SegmentedTabs
              active={activeTab}
              onSelect={setActiveTab}
              tabs={[
                { key: "open", label: "Em aberto", count: counts.open },
                { key: "completed", label: "Concluídas", count: counts.completed },
                { key: "canceled", label: "Canceladas", count: counts.canceled },
              ]}
            />
          </View>
        ) : null}
        <View style={styles.listBlock}>{renderRequests()}</View>
      </View>

      {reviewContract ? (
        <ReviewModal
          contractId={reviewContract.id}
          onClose={() => setReviewContract(null)}
          onReviewed={refetch}
          subtitle={`Como foi o serviço de ${reviewContract.professionalName}?`}
          title="Avaliar profissional"
        />
      ) : null}

      {cancelContractId ? (
        <CancelServiceModal
          contractId={cancelContractId}
          onCanceled={refetch}
          onClose={() => setCancelContractId(null)}
        />
      ) : null}
    </ScrollView>
  )

  function renderRequests() {
    if (isLoading) {
      return <LoadingState />
    }

    if (error && requests.length === 0) {
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

    if (requests.length === 0) {
      return (
        <EmptyState
          actionLabel="Criar minha primeira solicitação"
          description="Você ainda não criou nenhuma solicitação. Comece agora e receba propostas de profissionais."
          icon="document-text-outline"
          onPressAction={goToCreateRequest}
          title="Nenhuma solicitação ainda"
        />
      )
    }

    if (visibleRequests.length === 0) {
      if (search.trim()) {
        return (
          <EmptyState
            description="Nenhuma solicitação corresponde à sua busca."
            icon="search-outline"
            title="Sem resultados"
          />
        )
      }

      const empty = EMPTY_BY_TAB[activeTab]
      return (
        <EmptyState description={empty.description} icon="document-text-outline" title={empty.title} />
      )
    }

    return (
      <View style={styles.cardList}>
        {visibleRequests.map((request) => (
          <RequestCard
            key={request.id}
            onCancelContract={
              request.contract ? () => setCancelContractId(request.contract!.id) : undefined
            }
            onPress={() =>
              router.push(`${routes.requestDetails}?id=${request.id}` as Href)
            }
            onReview={
              request.contract ? () => setReviewContract(request.contract!) : undefined
            }
            request={request}
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
  tabsBlock: {
    marginTop: 14,
  },
})
