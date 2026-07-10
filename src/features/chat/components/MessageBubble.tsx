import { Ionicons } from "@expo/vector-icons"
import { Pressable, StyleSheet, Text, View } from "react-native"

import { colors, radius } from "@/features/client-home/theme"

import { formatMessageTime } from "../format"
import type { ChatMessage } from "../types"

// Um balão de mensagem. Enviadas ficam à direita (verde); recebidas à esquerda
// (claro). Nas enviadas: relógio enquanto envia, duplo-check quando lida, e um
// aviso tocável de "não enviada" quando falha (reenvia sem reescrever).
export function MessageBubble({
  message,
  onRetry,
}: {
  message: ChatMessage
  onRetry?: (message: ChatMessage) => void
}) {
  const mine = message.mine
  const failed = message.status === "failed"
  const sending = message.status === "sending"

  const bubble = (
    <View style={[styles.bubble, mine ? styles.bubbleMine : styles.bubbleTheirs]}>
      <Text style={[styles.text, mine ? styles.textMine : styles.textTheirs]}>
        {message.content}
      </Text>
      <View style={styles.meta}>
        <Text style={[styles.time, mine ? styles.timeMine : styles.timeTheirs]}>
          {formatMessageTime(message.createdAt)}
        </Text>
        {mine && !failed ? renderReceipt(sending, message.read) : null}
      </View>
    </View>
  )

  return (
    <View style={[styles.row, mine ? styles.rowMine : styles.rowTheirs]}>
      <View style={[styles.column, mine ? styles.columnMine : styles.columnTheirs]}>
        {failed ? (
          <Pressable accessibilityRole="button" onPress={() => onRetry?.(message)}>
            {bubble}
            <View style={styles.failedRow}>
              <Ionicons color={colors.danger} name="alert-circle" size={13} />
              <Text style={styles.failedText}>Não enviada · Toque para tentar novamente</Text>
            </View>
          </Pressable>
        ) : (
          bubble
        )}
      </View>
    </View>
  )
}

// Recibo do lado de quem enviou: relógio (enviando), duplo-check verde-claro
// (lida) ou check simples (entregue, ainda não lida).
function renderReceipt(sending: boolean, read: boolean) {
  if (sending) {
    return <Ionicons color="rgba(255,255,255,0.7)" name="time-outline" size={13} />
  }
  return (
    <Ionicons
      color={read ? "#DCFCE7" : "rgba(255,255,255,0.6)"}
      name={read ? "checkmark-done" : "checkmark"}
      size={14}
    />
  )
}

const styles = StyleSheet.create({
  bubble: {
    borderRadius: radius.card,
    gap: 2,
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
  column: {
    maxWidth: "80%",
  },
  columnMine: {
    alignItems: "flex-end",
  },
  columnTheirs: {
    alignItems: "flex-start",
  },
  failedRow: {
    alignItems: "center",
    alignSelf: "flex-end",
    flexDirection: "row",
    gap: 4,
    marginTop: 3,
    paddingHorizontal: 2,
  },
  failedText: {
    color: colors.danger,
    fontSize: 11,
    fontWeight: "500",
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
