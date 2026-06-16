import { Redirect, Stack } from "expo-router"
import { useRef } from "react"
import { ActivityIndicator, StyleSheet, View } from "react-native"

import { routes } from "@/constants/routes"
import { authClient } from "@/lib/auth-client"

export default function AuthLayout() {
  const { data: session, isPending } = authClient.useSession()
  // Só bloqueamos no carregamento inicial. Mutações como o cadastro disparam um
  // refetch da sessão (isPending volta a true); se desmontássemos o Stack aqui,
  // a navegação para /verify-email seria perdida e a pilha voltaria ao login.
  const hasLoadedOnce = useRef(false)

  if (isPending && !hasLoadedOnce.current) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator color="#0F766E" />
      </View>
    )
  }

  hasLoadedOnce.current = true

  if (session) {
    return <Redirect href={routes.home} />
  }

  return <Stack screenOptions={{ headerShown: false }} />
}

const styles = StyleSheet.create({
  loading: {
    alignItems: "center",
    backgroundColor: "#F8FAFC",
    flex: 1,
    justifyContent: "center",
  },
})
