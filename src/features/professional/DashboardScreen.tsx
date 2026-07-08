import { type Href, router } from "expo-router"
import {
  ActivityIndicator,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native"
import { useSafeAreaInsets } from "react-native-safe-area-context"

import { routes } from "@/constants/routes"
import { colors, spacing } from "@/features/client-home/theme"
import { formatProposalPrice } from "@/features/proposals/format"

import { DashboardCard } from "./components/DashboardCard"
import { useProfessionalDashboard } from "./hooks"

// Abre a tela de serviços já no filtro correspondente ao cartão tocado.
function goToServices(filter: "accepted" | "in_progress" | "rejected") {
  router.push(`${routes.services}?filter=${filter}` as Href)
}

export function DashboardScreen() {
  const insets = useSafeAreaInsets()
  const { dashboard, isLoading, isRefreshing, error, refetch } = useProfessionalDashboard()

  return (
    <ScrollView
      contentContainerStyle={[styles.content, { paddingTop: insets.top + 12 }]}
      refreshControl={
        <RefreshControl onRefresh={refetch} refreshing={isRefreshing} tintColor={colors.accent} />
      }
      style={styles.screen}
    >
      <View>
        <Text style={styles.title}>Dashboard</Text>
        <Text style={styles.subtitle}>Acompanhe seus serviços e ganhos</Text>
      </View>

      {isLoading && !dashboard ? (
        <View style={styles.centered}>
          <ActivityIndicator color={colors.accent} />
        </View>
      ) : error && !dashboard ? (
        <Text style={styles.error}>{error}</Text>
      ) : (
        <View style={styles.grid}>
          <View style={styles.row}>
            <DashboardCard
              icon="construct-outline"
              label="Serviços para iniciar"
              onPress={() => goToServices("accepted")}
              value={dashboard?.servicesToStart ?? 0}
            />
            <DashboardCard
              icon="time-outline"
              label="Em andamento"
              onPress={() => goToServices("in_progress")}
              value={dashboard?.servicesInProgress ?? 0}
            />
          </View>
          <View style={styles.row}>
            <DashboardCard
              icon="close-circle-outline"
              label="Propostas recusadas"
              onPress={() => goToServices("rejected")}
              value={dashboard?.rejectedProposals ?? 0}
            />
            <DashboardCard
              icon="cash-outline"
              label="Total arrecadado"
              tone="accent"
              value={formatProposalPrice(dashboard?.totalEarned ?? 0)}
            />
          </View>
        </View>
      )}
    </ScrollView>
  )
}

const styles = StyleSheet.create({
  centered: {
    paddingVertical: 32,
  },
  content: {
    gap: 20,
    paddingBottom: 28,
    paddingHorizontal: spacing.screen,
  },
  error: {
    color: colors.textSecondary,
    fontSize: 14,
    textAlign: "center",
  },
  grid: {
    gap: spacing.cardGap,
  },
  row: {
    flexDirection: "row",
    gap: spacing.cardGap,
  },
  screen: {
    backgroundColor: colors.screenBg,
    flex: 1,
  },
  subtitle: {
    color: colors.textSecondary,
    fontSize: 14,
    marginTop: 4,
  },
  title: {
    color: colors.textPrimary,
    fontSize: 24,
    fontWeight: "700",
  },
})
