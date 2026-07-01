import { type Href, router } from "expo-router"
import { useMemo, useState } from "react"
import {
  ActivityIndicator,
  RefreshControl,
  ScrollView,
  StyleSheet,
  View,
} from "react-native"
import { useSafeAreaInsets } from "react-native-safe-area-context"

import { routes } from "@/constants/routes"
import { CreateRequestButton } from "@/features/client-home/components/CreateRequestButton"
import { EmptyState } from "@/features/client-home/components/EmptyState"
import { FilterChips } from "@/features/client-home/components/FilterChips"
import { HomeHeader } from "@/features/client-home/components/HomeHeader"
import { RequestCard } from "@/features/client-home/components/RequestCard"
import { SearchBar } from "@/features/client-home/components/SearchBar"
import { SectionHeader } from "@/features/client-home/components/SectionHeader"
import { SummaryCards } from "@/features/client-home/components/SummaryCards"
import { getFirstName, getGreeting, getInitials } from "@/features/client-home/greeting"
import { colors, spacing } from "@/features/client-home/theme"
import { CancelServiceModal } from "@/features/contracts/CancelServiceModal"
import { useUnreadNotifications } from "@/features/notifications/hooks"
import { ReviewModal } from "@/features/service-requests/components/ReviewModal"
import { useServiceRequests } from "@/features/service-requests/hooks"
import type { RequestContract } from "@/features/service-requests/types"
import { authClient } from "@/lib/auth-client"

const FILTERS = ["Todas", "Perto de mim", "Recentes"]

export function ClientHome() {
  const { data: session } = authClient.useSession()
  const insets = useSafeAreaInsets()
  const { requests, summary, isLoading, isRefreshing, error, refetch } = useServiceRequests()
  const { unreadCount } = useUnreadNotifications()

  const [search, setSearch] = useState("")
  const [activeFilter, setActiveFilter] = useState(FILTERS[0])
  const [reviewContract, setReviewContract] = useState<RequestContract | null>(null)
  const [cancelContractId, setCancelContractId] = useState<string | null>(null)

  const filteredRequests = useMemo(() => {
    const term = search.trim().toLowerCase()

    if (!term) {
      return requests
    }

    return requests.filter((request) =>
      [request.title, request.category.name, request.city.name].some((field) =>
        field.toLowerCase().includes(term),
      ),
    )
  }, [requests, search])

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
        <FilterChips active={activeFilter} onSelect={setActiveFilter} options={FILTERS} />
      </View>

      <CreateRequestButton onPress={goToCreateRequest} />

      <SummaryCards summary={summary} />

      <View>
        <SectionHeader title="Minhas solicitações" />
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
      return (
        <View style={styles.centered}>
          <ActivityIndicator color={colors.accent} />
        </View>
      )
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

    if (filteredRequests.length === 0) {
      return (
        <EmptyState
          description="Nenhuma solicitação corresponde à sua busca."
          icon="search-outline"
          title="Sem resultados"
        />
      )
    }

    return (
      <View style={styles.cardList}>
        {filteredRequests.map((request) => (
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
  centered: {
    paddingVertical: 32,
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
