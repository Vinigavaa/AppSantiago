import { Ionicons } from "@expo/vector-icons"
import { useState } from "react"
import { ActivityIndicator, Alert, Image, Pressable, StyleSheet, TextInput, View } from "react-native"

import { colors, radius } from "@/features/client-home/theme"
import { pickChatImage, uploadChatAttachment } from "@/features/uploads/chatAttachmentUpload"

import type { PendingPhoto } from "../types"

type Props = {
  onSend: (content: string, attachment?: { photo: PendingPhoto; localUri: string }) => void
}

// Barra de digitação. O envio é otimista: limpa o campo e entrega na hora para a
// conversa (que mostra o estado de envio). Uma foto pode ir sozinha ou com
// legenda; ela sobe para a Cloudinary aqui, antes do envio, para que um reenvio
// não precise subir de novo.
export function MessageInput({ onSend }: Props) {
  const [value, setValue] = useState("")
  const [photoUri, setPhotoUri] = useState<string | null>(null)
  const [isUploading, setIsUploading] = useState(false)

  const trimmed = value.trim()
  const canSend = (trimmed.length > 0 || photoUri !== null) && !isUploading

  async function handleAttach() {
    const picked = await pickChatImage()

    if (picked === "denied") {
      Alert.alert("Permissão negada", "Autorize o acesso às fotos para anexar uma imagem.")
      return
    }

    if (picked === "canceled") {
      return
    }

    setPhotoUri(picked.uri)
  }

  async function handleSend() {
    if (!canSend) {
      return
    }

    // Só texto: envia direto.
    if (!photoUri) {
      setValue("")
      onSend(trimmed)
      return
    }

    setIsUploading(true)
    const uploaded = await uploadChatAttachment(photoUri)
    setIsUploading(false)

    if (!uploaded.ok) {
      // A foto continua selecionada para o usuário tentar de novo sem reescolher.
      Alert.alert("Não foi possível enviar a foto", uploaded.error)
      return
    }

    setValue("")
    setPhotoUri(null)
    onSend(trimmed, { photo: uploaded.data, localUri: photoUri })
  }

  return (
    <View style={styles.wrapper}>
      {photoUri ? (
        <View style={styles.preview}>
          <Image source={{ uri: photoUri }} style={styles.previewImage} />
          <Pressable
            accessibilityLabel="Remover foto"
            accessibilityRole="button"
            disabled={isUploading}
            hitSlop={6}
            onPress={() => setPhotoUri(null)}
            style={styles.previewRemove}
          >
            <Ionicons color="#FFFFFF" name="close" size={14} />
          </Pressable>
        </View>
      ) : null}

      <View style={styles.container}>
        <Pressable
          accessibilityLabel="Anexar foto"
          accessibilityRole="button"
          disabled={isUploading}
          onPress={handleAttach}
          style={({ pressed }) => [styles.attachButton, pressed && styles.pressed]}
        >
          <Ionicons color={colors.textSecondary} name="image-outline" size={22} />
        </Pressable>

        <TextInput
          multiline
          onChangeText={setValue}
          placeholder={photoUri ? "Legenda (opcional)" : "Mensagem"}
          placeholderTextColor={colors.textTertiary}
          style={styles.input}
          value={value}
        />

        <Pressable
          accessibilityLabel="Enviar mensagem"
          accessibilityRole="button"
          disabled={!canSend}
          onPress={handleSend}
          style={({ pressed }) => [
            styles.sendButton,
            !canSend && styles.sendButtonDisabled,
            pressed && canSend && styles.pressed,
          ]}
        >
          {isUploading ? (
            <ActivityIndicator color="#FFFFFF" size="small" />
          ) : (
            <Ionicons color="#FFFFFF" name="arrow-up" size={20} />
          )}
        </Pressable>
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  attachButton: {
    alignItems: "center",
    height: 42,
    justifyContent: "center",
    width: 34,
  },
  container: {
    alignItems: "flex-end",
    flexDirection: "row",
    gap: 4,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  input: {
    backgroundColor: colors.iconMutedBg,
    borderRadius: radius.search,
    color: colors.textPrimary,
    flex: 1,
    fontSize: 15,
    maxHeight: 120,
    paddingHorizontal: 14,
    paddingTop: 10,
    paddingBottom: 10,
  },
  pressed: {
    opacity: 0.8,
  },
  preview: {
    paddingHorizontal: 12,
    paddingTop: 10,
    width: 96,
  },
  previewImage: {
    aspectRatio: 1,
    backgroundColor: colors.iconMutedBg,
    borderRadius: radius.tag,
    width: "100%",
  },
  previewRemove: {
    alignItems: "center",
    backgroundColor: "rgba(0,0,0,0.6)",
    borderRadius: 999,
    height: 22,
    justifyContent: "center",
    position: "absolute",
    right: 6,
    top: 14,
    width: 22,
  },
  sendButton: {
    alignItems: "center",
    backgroundColor: colors.accent,
    borderRadius: radius.avatar,
    height: 42,
    justifyContent: "center",
    width: 42,
  },
  sendButtonDisabled: {
    backgroundColor: colors.textTertiary,
  },
  wrapper: {
    backgroundColor: colors.surface,
    borderTopColor: colors.cardBorder,
    borderTopWidth: 1,
  },
})
