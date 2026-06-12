import { StyleSheet, Text, View } from "react-native"

import { Button } from "@/components/ui/Button"
import { useAuth } from "@/features/auth/hooks/useAuth"
import { authClient } from "@/lib/auth-client"

export default function Home() {
  const { signOut, isSubmitting } = useAuth()
  const { data: session } = authClient.useSession()
  const role = session?.user.role === "PROFESSIONAL" ? "Profissional" : "Cliente"

  return (
    <View style={styles.container}>
      <View style={styles.content}>
        <Text style={styles.title}>Área logada</Text>
        <Text style={styles.subtitle}>Olá, {session?.user.name}.</Text>
        <Text style={styles.role}>Perfil: {role}</Text>
      </View>

      <Button disabled={isSubmitting} label="Sair" onPress={signOut} variant="secondary" />
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: "#F8FAFC",
    flex: 1,
    justifyContent: "space-between",
    padding: 24,
    paddingTop: 72,
  },
  content: {
    gap: 10,
  },
  role: {
    color: "#0F766E",
    fontSize: 16,
    fontWeight: "700",
  },
  subtitle: {
    color: "#475569",
    fontSize: 18,
  },
  title: {
    color: "#0F172A",
    fontSize: 32,
    fontWeight: "800",
  },
})
