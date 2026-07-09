import { Pressable, StyleSheet, Text, View } from "react-native"

import { colors, radius, spacing } from "@/features/client-home/theme"

import { formatChatListTime } from "../format"
import type { ChatSummary } from "../types"
import { ChatAvatar } from "./ChatAvatar"

// Uma conversa na lista principal: foto, nome, prévia da última mensagem, horário
// e a bolinha de não-lidas quando há mensagens novas.
export function ChatListItem({ chat, onPress }: { chat: ChatSummary; onPress: () => void }) {
  const hasUnread = chat.unreadCount > 0
  const preview = chat.lastMessage
    ? `${chat.lastMessage.mine ? "Você: " : ""}${chat.lastMessage.content}`
    : "Nenhuma mensagem ainda"

  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => [styles.container, pressed && styles.pressed]}
    >
      <ChatAvatar avatarUrl={chat.otherUser.avatarUrl} name={chat.otherUser.name} size={52} />

      <View style={styles.middle}>
        <Text numberOfLines={1} style={styles.name}>
          {chat.otherUser.name}
        </Text>
        <Text
          numberOfLines={1}
          style={[styles.preview, hasUnread && styles.previewUnread]}
        >
          {preview}
        </Text>
      </View>

      <View style={styles.right}>
        {chat.lastMessage ? (
          <Text style={[styles.time, hasUnread && styles.timeUnread]}>
            {formatChatListTime(chat.lastMessage.createdAt)}
          </Text>
        ) : null}
        {hasUnread ? (
          <View style={styles.badge}>
            <Text style={styles.badgeText}>{chat.unreadCount > 99 ? "99+" : chat.unreadCount}</Text>
          </View>
        ) : null}
      </View>
    </Pressable>
  )
}

const styles = StyleSheet.create({
  badge: {
    alignItems: "center",
    backgroundColor: colors.accent,
    borderRadius: radius.chip,
    justifyContent: "center",
    minWidth: 20,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  badgeText: {
    color: "#FFFFFF",
    fontSize: 12,
    fontWeight: "700",
  },
  container: {
    alignItems: "center",
    flexDirection: "row",
    gap: 12,
    paddingHorizontal: spacing.screen,
    paddingVertical: 12,
  },
  middle: {
    flex: 1,
    gap: 3,
  },
  name: {
    color: colors.textPrimary,
    fontSize: 16,
    fontWeight: "600",
  },
  preview: {
    color: colors.textSecondary,
    fontSize: 14,
  },
  previewUnread: {
    color: colors.textPrimary,
    fontWeight: "600",
  },
  pressed: {
    backgroundColor: colors.iconMutedBg,
  },
  right: {
    alignItems: "flex-end",
    gap: 6,
  },
  time: {
    color: colors.textTertiary,
    fontSize: 12,
  },
  timeUnread: {
    color: colors.accent,
    fontWeight: "600",
  },
})
