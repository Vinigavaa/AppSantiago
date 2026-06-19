import { ScrollView, StyleSheet, Text, View } from "react-native"
import { useSafeAreaInsets } from "react-native-safe-area-context"

import { Button } from "@/components/ui/Button"
import { useAuth } from "@/features/auth/hooks/useAuth"
import { getInitials } from "@/features/client-home/greeting"
import { colors, radius, spacing } from "@/features/client-home/theme"
import { authClient } from "@/lib/auth-client"

export function ClientProfileScreen() {
  const { data: session } = authClient.useSession()
  const { signOut, isSubmitting } = useAuth()
  const insets = useSafeAreaInsets()

  const name = session?.user.name ?? "Cliente"
  const email = session?.user.email ?? ""

  return (
    <ScrollView
      contentContainerStyle={[styles.content, { paddingTop: insets.top + 12 }]}
      style={styles.screen}
    >
      <Text style={styles.title}>Perfil</Text>

      <View style={styles.card}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>{getInitials(name)}</Text>
        </View>
        <Text style={styles.name}>{name}</Text>
        {email ? <Text style={styles.email}>{email}</Text> : null}
      </View>

      <Button
        disabled={isSubmitting}
        label={isSubmitting ? "Saindo..." : "Sair"}
        onPress={signOut}
        variant="secondary"
      />
    </ScrollView>
  )
}

const styles = StyleSheet.create({
  avatar: {
    alignItems: "center",
    backgroundColor: colors.avatarBg,
    borderRadius: radius.avatar,
    height: 72,
    justifyContent: "center",
    width: 72,
  },
  avatarText: {
    color: colors.avatarText,
    fontSize: 24,
    fontWeight: "700",
  },
  card: {
    alignItems: "center",
    backgroundColor: colors.surface,
    borderColor: colors.cardBorder,
    borderRadius: radius.card,
    borderWidth: 1,
    gap: 6,
    paddingHorizontal: 20,
    paddingVertical: 28,
  },
  content: {
    gap: 20,
    paddingBottom: 28,
    paddingHorizontal: spacing.screen,
  },
  email: {
    color: colors.textSecondary,
    fontSize: 14,
  },
  name: {
    color: colors.textPrimary,
    fontSize: 20,
    fontWeight: "700",
    marginTop: 6,
  },
  screen: {
    backgroundColor: colors.screenBg,
    flex: 1,
  },
  title: {
    color: colors.textPrimary,
    fontSize: 24,
    fontWeight: "700",
  },
})
