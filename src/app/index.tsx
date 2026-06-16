import { Redirect } from "expo-router"
import { useEffect, useState } from "react"
import { ActivityIndicator, StyleSheet, View } from "react-native"

import { routes } from "@/constants/routes"
import { getPendingVerificationEmail } from "@/features/auth/storage"
import { authClient } from "@/lib/auth-client"

export default function Index() {
  const { data: session, isPending } = authClient.useSession()
  // undefined enquanto carrega; null ou string após resolver o storage.
  const [pendingEmail, setPendingEmail] = useState<string | null | undefined>(undefined)

  useEffect(() => {
    getPendingVerificationEmail().then(setPendingEmail)
  }, [])

  if (isPending || pendingEmail === undefined) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator color="#0F766E" />
      </View>
    )
  }

  if (session) {
    return <Redirect href={routes.home} />
  }

  if (pendingEmail) {
    return <Redirect href={{ pathname: "/verify-email", params: { email: pendingEmail } }} />
  }

  return <Redirect href={routes.login} />
}

const styles = StyleSheet.create({
  loading: {
    alignItems: "center",
    backgroundColor: "#F8FAFC",
    flex: 1,
    justifyContent: "center",
  },
})
