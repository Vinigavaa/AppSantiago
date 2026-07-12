import { Image, StyleSheet, Text, View } from "react-native"

import { colors } from "@/features/client-home/theme"

type Props = {
  uri: string | null | undefined
  initials: string
  size?: number
}

// Avatar circular: mostra a foto quando ha uri, senao as iniciais. Primitivo
// compartilhado entre perfis e cabecalhos (cliente e profissional).
export function Avatar({ uri, initials, size = 76 }: Props) {
  const circle = {
    borderRadius: size / 2,
    height: size,
    width: size,
  }

  if (uri) {
    return <Image source={{ uri }} style={[styles.image, circle]} />
  }

  return (
    <View style={[styles.fallback, circle]}>
      <Text style={[styles.initials, { fontSize: size * 0.34 }]}>{initials}</Text>
    </View>
  )
}

const styles = StyleSheet.create({
  fallback: {
    alignItems: "center",
    backgroundColor: colors.avatarBg,
    justifyContent: "center",
  },
  image: {
    backgroundColor: colors.avatarBg,
  },
  initials: {
    color: colors.avatarText,
    fontWeight: "700",
  },
})
