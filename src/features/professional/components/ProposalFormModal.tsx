import { Ionicons } from "@expo/vector-icons"
import { useEffect, useState } from "react"
import {
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native"
import { useSafeAreaInsets } from "react-native-safe-area-context"

import { Button } from "@/components/ui/Button"
import { colors, radius, spacing } from "@/features/client-home/theme"
import { ESTIMATED_DAYS_OPTIONS } from "@/features/proposals/format"
import { sendProposal } from "@/features/proposals/service"
import type { OwnProposal } from "@/features/proposals/types"

type Props = {
  visible: boolean
  serviceRequestId: string
  onClose: () => void
  // Recebe a proposta criada para o detalhe refletir o envio na hora.
  onSent: (proposal: OwnProposal) => void
}

// Converte o texto do campo de valor em número (aceita vírgula ou ponto).
function parsePrice(value: string): number | null {
  const normalized = value.replace(/\./g, "").replace(",", ".").trim()
  const parsed = Number(normalized)
  return Number.isFinite(parsed) && parsed > 0 ? parsed : null
}

export function ProposalFormModal({ visible, serviceRequestId, onClose, onSent }: Props) {
  const insets = useSafeAreaInsets()
  const [price, setPrice] = useState("")
  const [message, setMessage] = useState("")
  const [estimatedDays, setEstimatedDays] = useState<number | null>(null)
  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (visible) {
      setPrice("")
      setMessage("")
      setEstimatedDays(null)
      setError(null)
    }
  }, [visible])

  async function handleSubmit() {
    if (isSaving) {
      return
    }

    const parsedPrice = parsePrice(price)

    if (parsedPrice === null) {
      setError("Informe um valor válido para a proposta.")
      return
    }

    if (message.trim().length < 10) {
      setError("Escreva uma mensagem com pelo menos 10 caracteres.")
      return
    }

    setIsSaving(true)
    setError(null)

    const result = await sendProposal({
      serviceRequestId,
      price: parsedPrice,
      message: message.trim(),
      estimatedDays,
    })

    setIsSaving(false)

    if (!result.ok) {
      setError(result.error)
      return
    }

    onSent(result.data)
    onClose()
  }

  return (
    <Modal animationType="slide" onRequestClose={onClose} visible={visible}>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        style={styles.screen}
      >
        <View style={[styles.header, { paddingTop: insets.top + 12 }]}>
          <Pressable accessibilityLabel="Fechar" accessibilityRole="button" hitSlop={8} onPress={onClose}>
            <Ionicons color={colors.textPrimary} name="close" size={24} />
          </Pressable>
          <Text style={styles.headerTitle}>Enviar proposta</Text>
        </View>

        <ScrollView
          contentContainerStyle={styles.content}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.field}>
            <Text style={styles.label}>Valor da proposta</Text>
            <View style={styles.priceWrap}>
              <Text style={styles.pricePrefix}>R$</Text>
              <TextInput
                keyboardType="numeric"
                maxLength={12}
                onChangeText={setPrice}
                placeholder="500"
                placeholderTextColor={colors.textTertiary}
                style={styles.priceInput}
                value={price}
              />
            </View>
          </View>

          <View style={styles.field}>
            <Text style={styles.label}>Mensagem para o cliente</Text>
            <TextInput
              maxLength={1000}
              multiline
              onChangeText={setMessage}
              placeholder="Apresente-se e explique como você pode ajudar neste serviço."
              placeholderTextColor={colors.textTertiary}
              style={[styles.input, styles.textArea]}
              value={message}
            />
          </View>

          <View style={styles.field}>
            <Text style={styles.label}>Prazo estimado (opcional)</Text>
            <View style={styles.chips}>
              {ESTIMATED_DAYS_OPTIONS.map((option) => {
                const active = estimatedDays === option.value
                return (
                  <Pressable
                    accessibilityRole="button"
                    key={option.value}
                    onPress={() => setEstimatedDays(active ? null : option.value)}
                    style={[styles.chip, active && styles.chipActive]}
                  >
                    <Text style={[styles.chipText, active && styles.chipTextActive]}>
                      {option.label}
                    </Text>
                  </Pressable>
                )
              })}
            </View>
          </View>

          {error ? <Text style={styles.error}>{error}</Text> : null}

          <Button
            disabled={isSaving}
            label={isSaving ? "Enviando..." : "Enviar proposta"}
            onPress={handleSubmit}
            style={styles.submit}
          />
        </ScrollView>
      </KeyboardAvoidingView>
    </Modal>
  )
}

const styles = StyleSheet.create({
  chip: {
    backgroundColor: colors.chipInactiveBg,
    borderColor: colors.chipInactiveBorder,
    borderRadius: radius.chip,
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 9,
  },
  chipActive: {
    backgroundColor: colors.chipActiveBg,
    borderColor: colors.chipActiveBg,
  },
  chipText: {
    color: colors.textSecondary,
    fontSize: 14,
    fontWeight: "500",
  },
  chipTextActive: {
    color: colors.chipActiveText,
  },
  chips: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  content: {
    gap: 20,
    paddingBottom: 40,
    paddingHorizontal: spacing.screen,
    paddingTop: 8,
  },
  error: {
    backgroundColor: "#FCE8E8",
    borderRadius: radius.tag,
    color: colors.danger,
    fontSize: 14,
    padding: 12,
  },
  field: {
    gap: 8,
  },
  header: {
    alignItems: "center",
    flexDirection: "row",
    gap: 12,
    paddingBottom: 12,
    paddingHorizontal: spacing.screen,
  },
  headerTitle: {
    color: colors.textPrimary,
    fontSize: 20,
    fontWeight: "700",
  },
  input: {
    backgroundColor: colors.surface,
    borderColor: colors.chipInactiveBorder,
    borderRadius: radius.search,
    borderWidth: 1,
    color: colors.textPrimary,
    fontSize: 15,
    minHeight: 50,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  label: {
    color: colors.textPrimary,
    fontSize: 14,
    fontWeight: "600",
  },
  priceInput: {
    color: colors.textPrimary,
    flex: 1,
    fontSize: 18,
    fontWeight: "600",
    paddingVertical: 12,
  },
  pricePrefix: {
    color: colors.textSecondary,
    fontSize: 16,
    fontWeight: "600",
  },
  priceWrap: {
    alignItems: "center",
    backgroundColor: colors.surface,
    borderColor: colors.chipInactiveBorder,
    borderRadius: radius.search,
    borderWidth: 1,
    flexDirection: "row",
    gap: 8,
    paddingHorizontal: 14,
  },
  screen: {
    backgroundColor: colors.screenBg,
    flex: 1,
  },
  submit: {
    marginTop: 4,
  },
  textArea: {
    height: 130,
    paddingTop: 12,
    textAlignVertical: "top",
  },
})
