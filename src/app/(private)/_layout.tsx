import { Ionicons } from "@expo/vector-icons"
import { Redirect, Tabs } from "expo-router"
import { useRef } from "react"
import { ActivityIndicator, type ColorValue, StyleSheet, View } from "react-native"

import { routes } from "@/constants/routes"
import { colors } from "@/features/client-home/theme"
import { authClient } from "@/lib/auth-client"

type IoniconName = keyof typeof Ionicons.glyphMap

function tabIcon(focused: IoniconName, unfocused: IoniconName) {
  return ({ color, focused: isFocused, size }: { color: ColorValue; focused: boolean; size: number }) => (
    <Ionicons color={color} name={isFocused ? focused : unfocused} size={size} />
  )
}

export default function PrivateLayout() {
  const { data: session, isPending } = authClient.useSession()

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
      <Tabs screenOptions={screenOptions}>
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
        <Tabs.Screen name="search" options={{ href: null }} />
        <Tabs.Screen name="proposals" options={{ href: null }} />
        <Tabs.Screen name="new-request" options={{ href: null }} />
        <Tabs.Screen name="professionals" options={{ href: null }} />
        <Tabs.Screen name="opportunity-details" options={{ href: null }} />
      </Tabs>
    )
  }

  return (
    <Tabs screenOptions={screenOptions}>
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
      <Tabs.Screen name="dashboard" options={{ href: null }} />
      <Tabs.Screen name="services" options={{ href: null }} />
      <Tabs.Screen name="new-request" options={{ href: null }} />
      <Tabs.Screen name="professionals" options={{ href: null }} />
      <Tabs.Screen name="opportunity-details" options={{ href: null }} />
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
    paddingTop: 6,
  },
  tabLabel: {
    fontSize: 11,
    fontWeight: "500",
  },
})

const screenOptions = {
  headerShown: false,
  tabBarActiveTintColor: colors.accent,
  tabBarInactiveTintColor: colors.textTertiary,
  tabBarLabelStyle: styles.tabLabel,
  tabBarStyle: styles.tabBar,
} as const
