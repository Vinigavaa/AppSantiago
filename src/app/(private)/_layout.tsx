import { Ionicons } from "@expo/vector-icons"
import { Redirect, Tabs } from "expo-router"
import { useRef } from "react"
import { ActivityIndicator, type ColorValue, StyleSheet, View } from "react-native"
import { useSafeAreaInsets } from "react-native-safe-area-context"

import { TabBadge } from "@/components/ui/TabBadge"
import { routes } from "@/constants/routes"
import { colors } from "@/features/client-home/theme"
import {
  NotificationBadgesProvider,
  useNotificationBadges,
} from "@/features/notifications/badges-context"
import type { BadgeArea } from "@/features/notifications/badges-types"
import { usePushRegistration } from "@/features/notifications/push"
import { authClient } from "@/lib/auth-client"

type IoniconName = keyof typeof Ionicons.glyphMap

// Ícone da aba com o indicador de pendência da área correspondente. Abas sem
// área (Início, Buscar) não recebem indicador.
function tabIcon(focused: IoniconName, unfocused: IoniconName, area?: BadgeArea) {
  return ({ color, focused: isFocused, size }: { color: ColorValue; focused: boolean; size: number }) => (
    <TabIcon area={area} color={color} name={isFocused ? focused : unfocused} size={size} />
  )
}

function TabIcon({
  area,
  color,
  name,
  size,
}: {
  area?: BadgeArea
  color: ColorValue
  name: IoniconName
  size: number
}) {
  const { badges } = useNotificationBadges()

  return (
    <View style={styles.tabIcon}>
      <Ionicons color={color} name={name} size={size} />
      {area ? <TabBadge count={badges[area]} /> : null}
    </View>
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

  return (
    <NotificationBadgesProvider>
      {session.user.role === "PROFESSIONAL" ? (
        <ProfessionalTabs bottomInset={insets.bottom} />
      ) : (
        <ClientTabs bottomInset={insets.bottom} />
      )}
    </NotificationBadgesProvider>
  )
}

// O profissional tem uma jornada própria, com navegação inferior distinta
// (Home permanece no centro). Demais telas ficam acessíveis sem aba própria.
function ProfessionalTabs({ bottomInset }: { bottomInset: number }) {
  return (
    <Tabs screenOptions={buildScreenOptions(bottomInset)}>
      <Tabs.Screen
        name="profile"
        options={{ tabBarIcon: tabIcon("person", "person-outline", "profile"), title: "Perfil" }}
      />
      <Tabs.Screen
        name="messages"
        options={{
          tabBarIcon: tabIcon("chatbubble-ellipses", "chatbubble-ellipses-outline", "messages"),
          title: "Mensagens",
        }}
      />
      <Tabs.Screen
        name="home"
        options={{ tabBarIcon: tabIcon("home", "home-outline"), title: "Home" }}
      />
      <Tabs.Screen
        name="dashboard"
        options={{
          tabBarIcon: tabIcon("stats-chart", "stats-chart-outline", "dashboard"),
          title: "Dashboard",
        }}
      />
      <Tabs.Screen
        name="services"
        options={{
          tabBarIcon: tabIcon("construct", "construct-outline", "services"),
          title: "Serviços",
        }}
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
      {/* Assinatura: alcançável pelo menu do perfil (router.push), nunca como aba. */}
      <Tabs.Screen name="subscription" options={{ href: null }} />
    </Tabs>
  )
}

function ClientTabs({ bottomInset }: { bottomInset: number }) {
  return (
    <Tabs screenOptions={buildScreenOptions(bottomInset)}>
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
          tabBarIcon: tabIcon("document-text", "document-text-outline", "proposals"),
          title: "Propostas",
        }}
      />
      <Tabs.Screen
        name="messages"
        options={{
          tabBarIcon: tabIcon("chatbubble-ellipses", "chatbubble-ellipses-outline", "messages"),
          title: "Mensagens",
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{ tabBarIcon: tabIcon("person", "person-outline", "profile"), title: "Perfil" }}
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
      {/* Assinatura: alcançável pelo menu do perfil (router.push), nunca como aba. */}
      <Tabs.Screen name="subscription" options={{ href: null }} />
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
  // Âncora para o indicador absoluto. Sem dimensões próprias: a barra mantém
  // exatamente a mesma altura e o mesmo espaçamento de quando não há badge.
  tabIcon: {
    position: "relative",
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
