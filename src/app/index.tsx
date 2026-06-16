import { Redirect } from "expo-router"
import { ActivityIndicator, StyleSheet, View } from "react-native"

import { routes } from "@/constants/routes"
import { authClient } from "@/lib/auth-client"

export default function Index() {
  const { data: session, isPending } = authClient.useSession()

  if (isPending) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator color="#0F766E" />
      </View>
    )
  }

  return <Redirect href={session ? routes.home : routes.login} />
}

const styles = StyleSheet.create({
  loading: {
    alignItems: "center",
    backgroundColor: "#F8FAFC",
    flex: 1,
    justifyContent: "center",
  },
})
