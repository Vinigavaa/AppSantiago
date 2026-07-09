import { Ionicons } from "@expo/vector-icons"
import { StyleSheet, Text, View } from "react-native"

import { colors, radius } from "@/features/client-home/theme"

import { formatMessageTime } from "../format"
import type { ChatMessage } from "../types"

// Um balão de mensagem. Enviadas ficam à direita (verde); recebidas à esquerda
// (claro). Nas enviadas, o duplo-check indica quando a mensagem foi lida.
export function MessageBubble({ message }: { message: ChatMessage }) {
  const mine = message.mine

  return (
    <View style={[styles.row, mine ? styles.rowMine : styles.rowTheirs]}>
      <View style={[styles.bubble, mine ? styles.bubbleMine : styles.bubbleTheirs]}>
        <Text style={[styles.text, mine ? styles.textMine : styles.textTheirs]}>
          {message.content}
        </Text>
        <View style={styles.meta}>
          <Text style={[styles.time, mine ? styles.timeMine : styles.timeTheirs]}>
            {formatMessageTime(message.createdAt)}
          </Text>
          {mine ? (
            <Ionicons
              color={message.read ? "#DCFCE7" : "rgba(255,255,255,0.6)"}
              name={message.read ? "checkmark-done" : "checkmark"}
              size={14}
            />
          ) : null}
        </View>
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  bubble: {
    borderRadius: radius.card,
    gap: 2,
    maxWidth: "80%",
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  bubbleMine: {
    backgroundColor: colors.accent,
    borderBottomRightRadius: 4,
  },
  bubbleTheirs: {
    backgroundColor: colors.surface,
    borderBottomLeftRadius: 4,
    borderColor: colors.cardBorder,
    borderWidth: 1,
  },
  meta: {
    alignItems: "center",
    alignSelf: "flex-end",
    flexDirection: "row",
    gap: 4,
  },
  row: {
    flexDirection: "row",
    paddingHorizontal: 4,
  },
  rowMine: {
    justifyContent: "flex-end",
  },
  rowTheirs: {
    justifyContent: "flex-start",
  },
  text: {
    fontSize: 15,
    lineHeight: 21,
  },
  textMine: {
    color: "#FFFFFF",
  },
  textTheirs: {
    color: colors.textPrimary,
  },
  time: {
    fontSize: 11,
  },
  timeMine: {
    color: "rgba(255,255,255,0.75)",
  },
  timeTheirs: {
    color: colors.textTertiary,
  },
})
