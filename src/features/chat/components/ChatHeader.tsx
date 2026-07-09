import { Ionicons } from "@expo/vector-icons"
import { Pressable, StyleSheet, Text, View } from "react-native"

import { colors, spacing } from "@/features/client-home/theme"

import type { ChatOtherUser } from "../types"
import { ChatAvatar } from "./ChatAvatar"

// Cabeçalho da conversa: voltar + foto e nome da outra pessoa. Tocar na identidade
// abre o perfil completo (quando disponível), permitindo alternar perfil/conversa.
export function ChatHeader({
  otherUser,
  paddingTop,
  onBack,
  onOpenProfile,
}: {
  otherUser: ChatOtherUser | null
  paddingTop: number
  onBack: () => void
  onOpenProfile?: () => void
}) {
  return (
    <View style={[styles.header, { paddingTop: paddingTop + 12 }]}>
      <Pressable
        accessibilityLabel="Voltar"
        accessibilityRole="button"
        hitSlop={8}
        onPress={onBack}
        style={({ pressed }) => [styles.backButton, pressed && styles.pressed]}
      >
        <Ionicons color={colors.textPrimary} name="chevron-back" size={22} />
      </Pressable>

      {otherUser ? (
        <Pressable
          accessibilityRole="button"
          disabled={!onOpenProfile}
          onPress={onOpenProfile}
          style={({ pressed }) => [styles.identity, pressed && onOpenProfile && styles.pressed]}
        >
          <ChatAvatar avatarUrl={otherUser.avatarUrl} name={otherUser.name} size={40} />
          <View style={styles.nameBlock}>
            <Text numberOfLines={1} style={styles.name}>
              {otherUser.name}
            </Text>
            {onOpenProfile ? <Text style={styles.link}>Ver perfil</Text> : null}
          </View>
        </Pressable>
      ) : null}
    </View>
  )
}

const styles = StyleSheet.create({
  backButton: {
    alignItems: "center",
    backgroundColor: colors.iconMutedBg,
    borderRadius: 999,
    height: 40,
    justifyContent: "center",
    width: 40,
  },
  header: {
    alignItems: "center",
    backgroundColor: colors.surface,
    borderBottomColor: colors.cardBorder,
    borderBottomWidth: 1,
    flexDirection: "row",
    gap: 12,
    paddingBottom: 12,
    paddingHorizontal: spacing.screen,
  },
  identity: {
    alignItems: "center",
    flex: 1,
    flexDirection: "row",
    gap: 10,
  },
  link: {
    color: colors.accent,
    fontSize: 12,
    fontWeight: "600",
  },
  name: {
    color: colors.textPrimary,
    fontSize: 17,
    fontWeight: "700",
  },
  nameBlock: {
    flex: 1,
    gap: 1,
  },
  pressed: {
    opacity: 0.7,
  },
})
