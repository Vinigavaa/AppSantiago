import { Ionicons } from "@expo/vector-icons"
import { Redirect, Tabs } from "expo-router"
import { useRef } from "react"
import { ActivityIndicator, type ColorValue, StyleSheet, View } from "react-native"
import { useSafeAreaInsets } from "react-native-safe-area-context"

import { routes } from "@/constants/routes"
import { colors } from "@/features/client-home/theme"
import { usePushRegistration } from "@/features/notifications/push"
import { authClient } from "@/lib/auth-client"

type IoniconName = keyof typeof Ionicons.glyphMap

function tabIcon(focused: IoniconName, unfocused: IoniconName) {
  return ({ color, focused: isFocused, size }: { color: ColorValue; focused: boolean; size: number }) => (
    <Ionicons color={color} name={isFocused ? focused : unfocused} size={size} />
  )
}

export default function PrivateLayout() {
  const { data: session, isPending } = authClient.useSession()
  const insets = useSafeAreaInsets()

  // Registra o dispositivo para push assim que há um usuário autenticado.
  usePushRegistration(session?.user.id)

  // Mesmo cuidado documentado para o grupo (auth): um refetch de sessão volta
  // isPending para true. Só bloqueamos no carregamento inicial, senão a barra
  // de abas é desmontada e perde o estado de navegação.
  const hasLoadedOnce = useRef(false)

  if (isPending && !hasLoadedOnce.current) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator color={colors.accent} />
      </View>
    )
  }

  hasLoadedOnce.current = true

  if (!session) {
    return <Redirect href={routes.login} />
  }

  // O profissional tem uma jornada própria, com navegação inferior distinta
  // (Home permanece no centro). Demais telas ficam acessíveis sem aba própria.
  if (session.user.role === "PROFESSIONAL") {
    return (
      <Tabs screenOptions={buildScreenOptions(insets.bottom)}>
        <Tabs.Screen
          name="profile"
          options={{ tabBarIcon: tabIcon("person", "person-outline"), title: "Perfil" }}
        />
        <Tabs.Screen
          name="messages"
          options={{
            tabBarIcon: tabIcon("chatbubble-ellipses", "chatbubble-ellipses-outline"),
            title: "Mensagens",
          }}
        />
        <Tabs.Screen
          name="home"
          options={{ tabBarIcon: tabIcon("home", "home-outline"), title: "Home" }}
        />
        <Tabs.Screen
          name="dashboard"
          options={{ tabBarIcon: tabIcon("stats-chart", "stats-chart-outline"), title: "Dashboard" }}
        />
        <Tabs.Screen
          name="services"
          options={{ tabBarIcon: tabIcon("construct", "construct-outline"), title: "Serviços" }}
        />

        {/* Telas exclusivas do cliente / alcançáveis por push: sem aba. */}
        <Tabs.Screen name="chat" options={{ href: null }} />
        <Tabs.Screen name="search" options={{ href: null }} />
        <Tabs.Screen name="proposals" options={{ href: null }} />
        <Tabs.Screen name="new-request" options={{ href: null }} />
        <Tabs.Screen name="request-details" options={{ href: null }} />
        <Tabs.Screen name="edit-request" options={{ href: null }} />
        <Tabs.Screen name="professional-profile" options={{ href: null }} />
        <Tabs.Screen name="professionals" options={{ href: null }} />
        <Tabs.Screen name="opportunity-details" options={{ href: null }} />
        <Tabs.Screen name="notifications" options={{ href: null }} />
        <Tabs.Screen name="blocked-users" options={{ href: null }} />
      </Tabs>
    )
  }

  return (
    <Tabs screenOptions={buildScreenOptions(insets.bottom)}>
      <Tabs.Screen
        name="home"
        options={{ tabBarIcon: tabIcon("home", "home-outline"), title: "Início" }}
      />
      <Tabs.Screen
        name="search"
        options={{ tabBarIcon: tabIcon("search", "search-outline"), title: "Buscar" }}
      />
      <Tabs.Screen
        name="proposals"
        options={{
          tabBarIcon: tabIcon("document-text", "document-text-outline"),
          title: "Propostas",
        }}
      />
      <Tabs.Screen
        name="messages"
        options={{
          tabBarIcon: tabIcon("chatbubble-ellipses", "chatbubble-ellipses-outline"),
          title: "Mensagens",
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{ tabBarIcon: tabIcon("person", "person-outline"), title: "Perfil" }}
      />

      {/* Telas exclusivas do profissional / alcançáveis por push: sem aba. */}
      <Tabs.Screen name="chat" options={{ href: null }} />
      <Tabs.Screen name="dashboard" options={{ href: null }} />
      <Tabs.Screen name="services" options={{ href: null }} />
      <Tabs.Screen name="new-request" options={{ href: null }} />
      <Tabs.Screen name="request-details" options={{ href: null }} />
      <Tabs.Screen name="edit-request" options={{ href: null }} />
      <Tabs.Screen name="professional-profile" options={{ href: null }} />
      <Tabs.Screen name="professionals" options={{ href: null }} />
      <Tabs.Screen name="opportunity-details" options={{ href: null }} />
      <Tabs.Screen name="notifications" options={{ href: null }} />
      <Tabs.Screen name="blocked-users" options={{ href: null }} />
    </Tabs>
  )
}

const styles = StyleSheet.create({
  loading: {
    alignItems: "center",
    backgroundColor: colors.screenBg,
    flex: 1,
    justifyContent: "center",
  },
  tabBar: {
    backgroundColor: colors.surface,
    borderTopColor: colors.cardBorder,
  },
  tabLabel: {
    fontSize: 11,
    fontWeight: "500",
  },
})

// Altura útil da barra (ícone + rótulo). A biblioteca reserva 49dp fixos, que não
// acomodam o rótulo quando o usuário aumenta a fonte do sistema — o texto era
// cortado ao meio.
const TAB_BAR_CONTENT_HEIGHT = 58

// O inset entra somado na altura de propósito: definir `height` faz a biblioteca
// usar este valor no lugar do cálculo dela (que já incluía o inset). Sem somar,
// a barra deixaria de reservar o espaço da navegação do sistema e os botões do
// Android cobririam as abas.
function buildScreenOptions(insetsBottom: number) {
  return {
    headerShown: false,
    tabBarActiveTintColor: colors.accent,
    tabBarInactiveTintColor: colors.textTertiary,
    tabBarLabelStyle: styles.tabLabel,
    tabBarStyle: [styles.tabBar, { height: TAB_BAR_CONTENT_HEIGHT + insetsBottom }],
  }
}
