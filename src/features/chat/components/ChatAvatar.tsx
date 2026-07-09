import { Image, StyleSheet, Text, View } from "react-native"

import { getInitials } from "@/features/client-home/greeting"
import { colors, radius } from "@/features/client-home/theme"

// Avatar da outra pessoa: foto quando existe, senão as iniciais do nome.
export function ChatAvatar({
  name,
  avatarUrl,
  size = 48,
}: {
  name: string
  avatarUrl: string | null
  size?: number
}) {
  const dimension = { width: size, height: size, borderRadius: radius.avatar }

  if (avatarUrl) {
    return <Image source={{ uri: avatarUrl }} style={dimension} />
  }

  return (
    <View style={[styles.fallback, dimension]}>
      <Text style={[styles.initials, { fontSize: size * 0.36 }]}>{getInitials(name)}</Text>
    </View>
  )
}

const styles = StyleSheet.create({
  fallback: {
    alignItems: "center",
    backgroundColor: colors.avatarBg,
    justifyContent: "center",
  },
  initials: {
    color: colors.avatarText,
    fontWeight: "700",
  },
})
