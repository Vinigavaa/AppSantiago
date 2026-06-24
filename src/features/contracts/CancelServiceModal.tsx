import { Ionicons } from "@expo/vector-icons"
import { useState } from "react"
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native"

import { colors, radius } from "@/features/client-home/theme"

import { cancelContract } from "./service"

type Props = {
  contractId: string
  onClose: () => void
  onCanceled: () => void
}

export function CancelServiceModal({ contractId, onClose, onCanceled }: Props) {
  const [reason, setReason] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  async function handleSubmit() {
    if (isSubmitting) {
      return
    }

    setIsSubmitting(true)
    setError(null)

    const result = await cancelContract(contractId, reason)

    if (result.ok) {
      onCanceled()
      onClose()
      return
    }

    setIsSubmitting(false)
    setError(result.error)
  }

  return (
    <Modal animationType="slide" onRequestClose={onClose} transparent visible>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        style={styles.backdrop}
      >
        <View style={styles.sheet}>
          <View style={styles.header}>
            <Text style={styles.title}>Cancelar serviço</Text>
            <Pressable hitSlop={8} onPress={onClose}>
              <Ionicons color={colors.textSecondary} name="close" size={24} />
            </Pressable>
          </View>

          <Text style={styles.subtitle}>
            O cancelamento é registrado e a outra parte é avisada. Conte o motivo (opcional).
          </Text>

          <TextInput
            maxLength={500}
            multiline
            onChangeText={setReason}
            placeholder="Motivo do cancelamento"
            placeholderTextColor={colors.textTertiary}
            style={styles.input}
            value={reason}
          />

          {error ? <Text style={styles.error}>{error}</Text> : null}

          <Pressable
            disabled={isSubmitting}
            onPress={handleSubmit}
            style={({ pressed }) => [
              styles.submit,
              isSubmitting && styles.submitDisabled,
              pressed && styles.pressed,
            ]}
          >
            {isSubmitting ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <Text style={styles.submitText}>Confirmar cancelamento</Text>
            )}
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
  error: {
    color: colors.danger,
    fontSize: 13,
  },
  header: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
  },
  input: {
    backgroundColor: colors.screenBg,
    borderRadius: radius.search,
    color: colors.textPrimary,
    fontSize: 15,
    height: 100,
    paddingHorizontal: 14,
    paddingTop: 12,
    textAlignVertical: "top",
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
    lineHeight: 19,
  },
  submit: {
    alignItems: "center",
    backgroundColor: colors.danger,
    borderRadius: radius.card,
    paddingVertical: 15,
  },
  submitDisabled: {
    opacity: 0.6,
  },
  submitText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "600",
  },
  title: {
    color: colors.textPrimary,
    fontSize: 19,
    fontWeight: "700",
  },
})
