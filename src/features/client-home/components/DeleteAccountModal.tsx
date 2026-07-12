import { Ionicons } from "@expo/vector-icons"
import { useEffect, useState } from "react"
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native"

import { colors, radius } from "../theme"

type Props = {
  visible: boolean
  onClose: () => void
  // Executa a exclusão. Retorna mensagem de erro (mantém aberto) ou null (sucesso).
  onConfirm: () => Promise<string | null>
}

const CONFIRM_WORD = "EXCLUIR"

const REMOVED_ITEMS = [
  "Seu perfil e dados pessoais",
  "Suas solicitações de serviço e propostas recebidas",
  "Suas conversas e mensagens",
  "Seu histórico de avaliações",
]

export function DeleteAccountModal({ visible, onClose, onConfirm }: Props) {
  const [confirmText, setConfirmText] = useState("")
  const [isDeleting, setIsDeleting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (visible) {
      setConfirmText("")
      setIsDeleting(false)
      setError(null)
    }
  }, [visible])

  const canDelete = confirmText.trim().toUpperCase() === CONFIRM_WORD

  async function handleConfirm() {
    if (isDeleting || !canDelete) {
      return
    }

    setIsDeleting(true)
    setError(null)

    const result = await onConfirm()

    if (result) {
      setIsDeleting(false)
      setError(result)
      return
    }
    // Em sucesso a sessão é encerrada pela tela; não reabilita o botão.
  }

  return (
    <Modal animationType="slide" onRequestClose={onClose} transparent visible={visible}>
      <KeyboardAvoidingView behavior="padding" style={styles.backdrop}>
        <View style={styles.sheet}>
          <View style={styles.header}>
            <View style={styles.iconCircle}>
              <Ionicons color={colors.danger} name="warning-outline" size={22} />
            </View>
            <Pressable hitSlop={8} onPress={onClose}>
              <Ionicons color={colors.textSecondary} name="close" size={24} />
            </Pressable>
          </View>

          <Text style={styles.title}>Excluir sua conta</Text>
          <Text style={styles.subtitle}>
            Esta ação é permanente e não pode ser desfeita. Os seguintes dados serão removidos:
          </Text>

          <View style={styles.list}>
            {REMOVED_ITEMS.map((item) => (
              <View key={item} style={styles.listItem}>
                <Ionicons color={colors.textTertiary} name="ellipse" size={6} />
                <Text style={styles.listText}>{item}</Text>
              </View>
            ))}
          </View>

          <Text style={styles.confirmLabel}>
            Para confirmar, digite <Text style={styles.confirmWord}>{CONFIRM_WORD}</Text> abaixo.
          </Text>
          <TextInput
            autoCapitalize="characters"
            autoCorrect={false}
            onChangeText={setConfirmText}
            placeholder={CONFIRM_WORD}
            placeholderTextColor={colors.textTertiary}
            style={styles.input}
            value={confirmText}
          />

          {error ? <Text style={styles.error}>{error}</Text> : null}

          <Pressable
            disabled={!canDelete || isDeleting}
            onPress={handleConfirm}
            style={({ pressed }) => [
              styles.deleteButton,
              (!canDelete || isDeleting) && styles.deleteDisabled,
              pressed && styles.pressed,
            ]}
          >
            {isDeleting ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <Text style={styles.deleteText}>Excluir conta definitivamente</Text>
            )}
          </Pressable>

          <Pressable disabled={isDeleting} onPress={onClose} style={styles.cancel}>
            <Text style={styles.cancelText}>Cancelar</Text>
          </Pressable>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  )
}

const styles = StyleSheet.create({
  backdrop: {
    backgroundColor: "rgba(0,0,0,0.45)",
    flex: 1,
    justifyContent: "flex-end",
  },
  cancel: {
    alignItems: "center",
    paddingVertical: 12,
  },
  cancelText: {
    color: colors.textSecondary,
    fontSize: 15,
    fontWeight: "600",
  },
  confirmLabel: {
    color: colors.textSecondary,
    fontSize: 14,
  },
  confirmWord: {
    color: colors.danger,
    fontWeight: "700",
  },
  deleteButton: {
    alignItems: "center",
    backgroundColor: colors.danger,
    borderRadius: radius.card,
    paddingVertical: 15,
  },
  deleteDisabled: {
    opacity: 0.5,
  },
  deleteText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "600",
  },
  error: {
    backgroundColor: colors.dangerSoft,
    borderRadius: radius.tag,
    color: colors.danger,
    fontSize: 14,
    padding: 12,
  },
  header: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
  },
  iconCircle: {
    alignItems: "center",
    backgroundColor: colors.dangerSoft,
    borderRadius: 999,
    height: 44,
    justifyContent: "center",
    width: 44,
  },
  input: {
    backgroundColor: colors.screenBg,
    borderColor: colors.chipInactiveBorder,
    borderRadius: radius.search,
    borderWidth: 1,
    color: colors.textPrimary,
    fontSize: 16,
    fontWeight: "600",
    letterSpacing: 1,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  list: {
    gap: 8,
  },
  listItem: {
    alignItems: "center",
    flexDirection: "row",
    gap: 10,
  },
  listText: {
    color: colors.textPrimary,
    flexShrink: 1,
    fontSize: 14,
  },
  pressed: {
    opacity: 0.85,
  },
  sheet: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    gap: 16,
    paddingBottom: 36,
    paddingHorizontal: 24,
    paddingTop: 20,
  },
  subtitle: {
    color: colors.textSecondary,
    fontSize: 14,
    lineHeight: 20,
  },
  title: {
    color: colors.textPrimary,
    fontSize: 20,
    fontWeight: "700",
  },
})
