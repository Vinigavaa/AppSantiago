import { Ionicons } from "@expo/vector-icons"
import { useState } from "react"
import { ActivityIndicator, Pressable, StyleSheet, TextInput, View } from "react-native"

import { colors, radius } from "@/features/client-home/theme"

// Barra de digitação. Envia com o botão; a estrutura de anexos entra no futuro
// sem mexer neste fluxo de texto.
export function MessageInput({
  onSend,
  isSending,
}: {
  onSend: (content: string) => Promise<boolean>
  isSending: boolean
}) {
  const [value, setValue] = useState("")
  const trimmed = value.trim()
  const canSend = trimmed.length > 0 && !isSending

  async function handleSend() {
    if (!canSend) {
      return
    }

    // Limpa otimista; se falhar, devolve o texto para o usuário tentar de novo.
    setValue("")
    const ok = await onSend(trimmed)
    if (!ok) {
      setValue(trimmed)
    }
  }

  return (
    <View style={styles.container}>
      <TextInput
        multiline
        onChangeText={setValue}
        placeholder="Mensagem"
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
        {isSending ? (
          <ActivityIndicator color="#FFFFFF" size="small" />
        ) : (
          <Ionicons color="#FFFFFF" name="arrow-up" size={20} />
        )}
      </Pressable>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    alignItems: "flex-end",
    backgroundColor: colors.surface,
    borderTopColor: colors.cardBorder,
    borderTopWidth: 1,
    flexDirection: "row",
    gap: 8,
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
})
