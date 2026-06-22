import { ActivityIndicator, RefreshControl, ScrollView, StyleSheet, Text, View } from "react-native"
import { useSafeAreaInsets } from "react-native-safe-area-context"

import { EmptyState } from "@/features/client-home/components/EmptyState"
import { colors, radius, spacing } from "@/features/client-home/theme"

import { ReceivedProposalCard } from "./components/ReceivedProposalCard"
import { useReceivedProposals } from "./hooks"

export function ReceivedProposalsScreen() {
  const insets = useSafeAreaInsets()
  const { proposals, isLoading, isRefreshing, error, refetch } = useReceivedProposals()

  return (
    <ScrollView
      contentContainerStyle={[styles.content, { paddingTop: insets.top + 12 }]}
      refreshControl={
        <RefreshControl onRefresh={refetch} refreshing={isRefreshing} tintColor={colors.accent} />
      }
      showsVerticalScrollIndicator={false}
      style={styles.screen}
    >
      <Text style={styles.title}>Propostas recebidas</Text>

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
          <ReceivedProposalCard key={proposal.id} proposal={proposal} />
        ))}
        <Text style={styles.footerNote}>
          Em breve você poderá aceitar ou recusar as propostas diretamente por aqui.
        </Text>
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
  footerNote: {
    backgroundColor: colors.accentSoftBg,
    borderRadius: radius.tag,
    color: colors.textSecondary,
    fontSize: 13,
    lineHeight: 18,
    overflow: "hidden",
    padding: 12,
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
