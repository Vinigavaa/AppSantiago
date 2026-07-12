import { Ionicons } from "@expo/vector-icons"
import { useState } from "react"
import { ActivityIndicator, Alert, Pressable, StyleSheet, View } from "react-native"

import { Avatar } from "@/components/ui/Avatar"
import { getInitials } from "@/features/client-home/greeting"
import { colors } from "@/features/client-home/theme"

import { pickAvatarImage, uploadAvatar } from "./avatarUpload"

type Props = {
  uri: string | null
  name: string
  size?: number
  onUploaded: (avatarUrl: string) => void
}

// Avatar tocavel: abre a galeria, envia a imagem e devolve a URL final. Usado
// nos perfis do cliente e do profissional (mesma logica, sem duplicar).
export function EditableAvatar({ uri, name, size = 84, onUploaded }: Props) {
  const [isUploading, setIsUploading] = useState(false)

  async function handlePress() {
    if (isUploading) {
      return
    }

    const picked = await pickAvatarImage()

    if (picked === "denied") {
      Alert.alert(
        "Permissão necessária",
        "Autorize o acesso às suas fotos para alterar a foto de perfil.",
      )
      return
    }

    if (picked === "canceled") {
      return
    }

    setIsUploading(true)
    const result = await uploadAvatar(picked.uri)
    setIsUploading(false)

    if (!result.ok) {
      Alert.alert("Não foi possível atualizar", result.error)
      return
    }

    onUploaded(result.data.avatarUrl)
  }

  return (
    <Pressable
      accessibilityLabel="Alterar foto de perfil"
      accessibilityRole="button"
      disabled={isUploading}
      onPress={handlePress}
      style={styles.wrap}
    >
      <Avatar initials={getInitials(name)} size={size} uri={uri} />

      {isUploading ? (
        <View style={[styles.overlay, { borderRadius: size / 2, height: size, width: size }]}>
          <ActivityIndicator color="#FFFFFF" />
        </View>
      ) : null}

      <View style={styles.badge}>
        <Ionicons color="#FFFFFF" name="camera" size={15} />
      </View>
    </Pressable>
  )
}

const styles = StyleSheet.create({
  badge: {
    alignItems: "center",
    backgroundColor: colors.accent,
    borderColor: colors.surface,
    borderRadius: 999,
    borderWidth: 2,
    bottom: -2,
    height: 28,
    justifyContent: "center",
    position: "absolute",
    right: -2,
    width: 28,
  },
  overlay: {
    alignItems: "center",
    backgroundColor: "rgba(0,0,0,0.4)",
    justifyContent: "center",
    position: "absolute",
  },
  wrap: {
    alignSelf: "center",
  },
})
