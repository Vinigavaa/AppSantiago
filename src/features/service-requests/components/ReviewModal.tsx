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
import { STAR_COLOR } from "@/features/professional/components/Stars"

import { submitReview } from "../service"
import type { RequestContract } from "../types"

type Props = {
  contract: RequestContract
  onClose: () => void
  onReviewed: () => void
}

export function ReviewModal({ contract, onClose, onReviewed }: Props) {
  const [rating, setRating] = useState(0)
  const [comment, setComment] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  async function handleSubmit() {
    if (isSubmitting) {
      return
    }

    if (rating < 1) {
      setError("Selecione uma nota de 1 a 5 estrelas.")
      return
    }

    setIsSubmitting(true)
    setError(null)

    const result = await submitReview({
      serviceContractId: contract.id,
      rating,
      comment: comment.trim() || undefined,
    })

    if (result.ok) {
      onReviewed()
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
            <Text style={styles.title}>Avaliar profissional</Text>
            <Pressable hitSlop={8} onPress={onClose}>
              <Ionicons color={colors.textSecondary} name="close" size={24} />
            </Pressable>
          </View>

          <Text style={styles.subtitle}>Como foi o serviço de {contract.professionalName}?</Text>

          <View style={styles.stars}>
            {[1, 2, 3, 4, 5].map((position) => (
              <Pressable
                hitSlop={4}
                key={position}
                onPress={() => {
                  setRating(position)
                  setError(null)
                }}
              >
                <Ionicons
                  color={STAR_COLOR}
                  name={rating >= position ? "star" : "star-outline"}
                  size={40}
                />
              </Pressable>
            ))}
          </View>

          <TextInput
            maxLength={1000}
            multiline
            onChangeText={setComment}
            placeholder="Conte como foi o atendimento (opcional)"
            placeholderTextColor={colors.textTertiary}
            style={styles.input}
            value={comment}
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
              <Text style={styles.submitText}>Enviar avaliação</Text>
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
  stars: {
    alignSelf: "center",
    flexDirection: "row",
    gap: 8,
  },
  subtitle: {
    color: colors.textSecondary,
    fontSize: 14,
  },
  submit: {
    alignItems: "center",
    backgroundColor: colors.accent,
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
