import {
  ActivityIndicator,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native"
import { useSafeAreaInsets } from "react-native-safe-area-context"

import { StatCards } from "@/features/client-home/components/StatCards"
import { colors, spacing } from "@/features/client-home/theme"

import { useProfessionalDashboard } from "./hooks"

export function DashboardScreen() {
  const insets = useSafeAreaInsets()
  const { dashboard, isLoading, isRefreshing, error, refetch } = useProfessionalDashboard()

  const rating =
    dashboard && dashboard.ratingCount > 0 ? dashboard.ratingAverage.toFixed(1) : "—"

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
        <Text style={styles.subtitle}>Seu desempenho neste mês</Text>
      </View>

      {isLoading && !dashboard ? (
        <View style={styles.centered}>
          <ActivityIndicator color={colors.accent} />
        </View>
      ) : error && !dashboard ? (
        <Text style={styles.error}>{error}</Text>
      ) : (
        <StatCards
          items={[
            { label: "Serviços", value: dashboard?.completedThisMonth ?? 0 },
            { label: "Propostas", value: dashboard?.proposalsThisMonth ?? 0 },
            { label: "Estrelas", value: rating },
          ]}
        />
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
