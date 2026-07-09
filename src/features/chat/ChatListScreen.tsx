import { type Href, router } from "expo-router"
import {
  ActivityIndicator,
  FlatList,
  RefreshControl,
  StyleSheet,
  Text,
  View,
} from "react-native"
import { useSafeAreaInsets } from "react-native-safe-area-context"

import { routes } from "@/constants/routes"
import { EmptyState } from "@/features/client-home/components/EmptyState"
import { colors, spacing } from "@/features/client-home/theme"

import { ChatListItem } from "./components/ChatListItem"
import { useChats } from "./hooks"

// Tela principal de conversas: lista apenas os chats de que o usuário participa.
export function ChatListScreen() {
  const insets = useSafeAreaInsets()
  const { chats, isLoading, isRefreshing, error, refetch } = useChats()

  return (
    <View style={styles.screen}>
      <View style={[styles.header, { paddingTop: insets.top + 12 }]}>
        <Text style={styles.headerTitle}>Mensagens</Text>
      </View>

      {isLoading && chats.length === 0 ? (
        <View style={styles.centered}>
          <ActivityIndicator color={colors.accent} />
        </View>
      ) : error && chats.length === 0 ? (
        <View style={styles.centered}>
          <EmptyState
            actionLabel="Tentar novamente"
            description={error}
            icon="cloud-offline-outline"
            onPressAction={refetch}
            title="Não foi possível carregar"
          />
        </View>
      ) : chats.length === 0 ? (
        <View style={styles.centered}>
          <EmptyState
            description="Suas conversas com clientes e profissionais aparecerão aqui."
            icon="chatbubble-ellipses-outline"
            title="Nenhuma conversa ainda"
          />
        </View>
      ) : (
        <FlatList
          contentContainerStyle={{ paddingBottom: insets.bottom + 16 }}
          data={chats}
          keyExtractor={(chat) => chat.id}
          refreshControl={
            <RefreshControl
              onRefresh={refetch}
              refreshing={isRefreshing}
              tintColor={colors.accent}
            />
          }
          renderItem={({ item }) => (
            <ChatListItem
              chat={item}
              onPress={() => router.push(`${routes.chat}?id=${item.id}` as Href)}
            />
          )}
          showsVerticalScrollIndicator={false}
        />
      )}
    </View>
  )
}

const styles = StyleSheet.create({
  centered: {
    flex: 1,
    justifyContent: "center",
    paddingHorizontal: spacing.screen,
  },
  header: {
    backgroundColor: colors.screenBg,
    paddingBottom: 12,
    paddingHorizontal: spacing.screen,
  },
  headerTitle: {
    color: colors.textPrimary,
    fontSize: 26,
    fontWeight: "700",
  },
  screen: {
    backgroundColor: colors.screenBg,
    flex: 1,
  },
})
