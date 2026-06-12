import { Redirect, Stack } from "expo-router"
import { ActivityIndicator, StyleSheet, View } from "react-native"

import { routes } from "@/constants/routes"
import { authClient } from "@/lib/auth-client"

export default function PrivateLayout() {
  const { data: session, isPending } = authClient.useSession()

  if (isPending) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator color="#0F766E" />
      </View>
    )
  }

  if (!session) {
    return <Redirect href={routes.login} />
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
