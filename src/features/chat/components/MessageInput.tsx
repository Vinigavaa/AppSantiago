import { Ionicons } from "@expo/vector-icons"
import { useState } from "react"
import { Pressable, StyleSheet, TextInput, View } from "react-native"

import { colors, radius } from "@/features/client-home/theme"

// Barra de digitação. O envio é otimista: limpa o campo e entrega na hora para a
// conversa (que mostra o estado de envio). A estrutura de anexos entra no futuro
// sem mexer neste fluxo de texto.
export function MessageInput({ onSend }: { onSend: (content: string) => void }) {
  const [value, setValue] = useState("")
  const trimmed = value.trim()
  const canSend = trimmed.length > 0

  function handleSend() {
    if (!canSend) {
      return
    }

    setValue("")
    onSend(trimmed)
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
        <Ionicons color="#FFFFFF" name="arrow-up" size={20} />
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
