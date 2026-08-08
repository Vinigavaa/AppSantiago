import { useState } from "react"
import { Alert, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native"

import { Button } from "@/components/ui/Button"
import { FormSheet } from "@/components/ui/FormSheet"
import { blockUser } from "@/features/blocks/service"
import { colors, radius, spacing, typography } from "@/features/client-home/theme"

import { reportContent } from "./service"
import {
  type ReportReason,
  type ReportTargetType,
  reportReasons,
  reportTargetLabels,
} from "./types"

const MIN_DETAILS_FOR_OTHER = 10
const MAX_DETAILS = 500

type Props = {
  visible: boolean
  targetType: ReportTargetType
  targetId: string
  // Nome de quem escreveu o conteúdo, usado na oferta de bloqueio. Sem ele, a
  // denúncia é registrada normalmente e o bloqueio não é oferecido.
  targetUserId?: string
  targetUserName?: string
  onClose: () => void
  onBlocked?: () => void
}

// Formulário de denúncia, reaproveitado por todas as telas que exibem conteúdo de
// outra pessoa. A análise é da moderação (até 24h); aqui só registramos o caso.
export function ReportSheet({
  visible,
  targetType,
  targetId,
  targetUserId,
  targetUserName,
  onClose,
  onBlocked,
}: Props) {
  const [reason, setReason] = useState<ReportReason | null>(null)
  const [details, setDetails] = useState("")
  const [isSending, setIsSending] = useState(false)
  const [error, setError] = useState<string | null>(null)

  function reset() {
    setReason(null)
    setDetails("")
    setError(null)
  }

  function close() {
    reset()
    onClose()
  }

  // Oferece bloquear logo após denunciar: quem denuncia costuma não querer mais
  // contato, e é o momento em que a ação faz sentido.
  function offerBlock() {
    if (!targetUserId || !targetUserName) {
      return
    }

    Alert.alert(
      "Bloquear também?",
      `Você deixa de ver ${targetUserName} e ele não consegue mais falar com você.`,
      [
        { text: "Agora não", style: "cancel" },
        {
          text: "Bloquear",
          style: "destructive",
          onPress: async () => {
            const result = await blockUser(targetUserId)

            if (result.ok) {
              onBlocked?.()
            } else {
              Alert.alert("Não foi possível bloquear", result.error)
            }
          },
        },
      ],
    )
  }

  async function handleSubmit() {
    if (!reason) {
      setError("Escolha um motivo.")
      return
    }

    if (reason === "OUTRO" && details.trim().length < MIN_DETAILS_FOR_OTHER) {
      setError(`Descreva o problema com pelo menos ${MIN_DETAILS_FOR_OTHER} caracteres.`)
      return
    }

    setIsSending(true)
    setError(null)

    const result = await reportContent({ targetType, targetId, reason, details })

    setIsSending(false)

    // Em caso de erro o formulário continua preenchido, para o usuário tentar de
    // novo sem redigitar o que escreveu.
    if (!result.ok) {
      setError(result.error)
      return
    }

    close()

    Alert.alert(
      "Denúncia enviada",
      "Nossa equipe analisa o caso em até 24 horas e toma as medidas necessárias. Obrigado por avisar.",
      [{ text: "OK", onPress: targetUserId ? offerBlock : undefined }],
    )
  }

  return (
    <FormSheet
      onClose={close}
      title={`Denunciar ${reportTargetLabels[targetType]}`}
      visible={visible}
    >
      <ScrollView
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
        style={styles.scroll}
      >
        <Text style={styles.intro}>
          Conte o que houve. A denúncia é anônima para a outra pessoa e analisada em até 24 horas.
        </Text>

        {reportReasons.map((option) => {
          const selected = reason === option.value

          return (
            <Pressable
              accessibilityRole="radio"
              accessibilityState={{ selected }}
              key={option.value}
              onPress={() => {
                setReason(option.value)
                setError(null)
              }}
              style={({ pressed }) => [
                styles.option,
                selected && styles.optionSelected,
                pressed && styles.pressed,
              ]}
            >
              <Text style={[styles.optionLabel, selected && styles.optionLabelSelected]}>
                {option.label}
              </Text>
            </Pressable>
          )
        })}

        <Text style={styles.detailsLabel}>
          {reason === "OUTRO" ? "Descreva o problema" : "Detalhes (opcional)"}
        </Text>
        <TextInput
          maxLength={MAX_DETAILS}
          multiline
          onChangeText={(text) => {
            setDetails(text)
            setError(null)
          }}
          placeholder="O que aconteceu?"
          placeholderTextColor={colors.textTertiary}
          style={styles.detailsInput}
          value={details}
        />

        {error ? <Text style={styles.error}>{error}</Text> : null}

        <Button
          label="Enviar denúncia"
          loading={isSending}
          onPress={handleSubmit}
          style={styles.submit}
          variant="danger"
        />
      </ScrollView>
    </FormSheet>
  )
}

const styles = StyleSheet.create({
  content: {
    gap: spacing.sm,
    paddingBottom: spacing.lg,
    paddingHorizontal: spacing.xl,
  },
  detailsInput: {
    ...typography.body,
    backgroundColor: colors.surface,
    borderColor: colors.chipInactiveBorder,
    borderRadius: radius.control,
    borderWidth: 1,
    color: colors.textPrimary,
    minHeight: 90,
    padding: 12,
    textAlignVertical: "top",
  },
  detailsLabel: {
    ...typography.label,
    color: colors.textPrimary,
    marginTop: spacing.sm,
  },
  error: {
    ...typography.caption,
    color: colors.danger,
  },
  intro: {
    ...typography.caption,
    color: colors.textSecondary,
    marginBottom: spacing.xs,
  },
  option: {
    backgroundColor: colors.chipInactiveBg,
    borderColor: colors.chipInactiveBorder,
    borderRadius: radius.control,
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  optionLabel: {
    ...typography.body,
    color: colors.textPrimary,
  },
  optionLabelSelected: {
    color: colors.onPrimary,
    fontWeight: "600",
  },
  optionSelected: {
    backgroundColor: colors.chipActiveBg,
    borderColor: colors.chipActiveBg,
  },
  pressed: {
    opacity: 0.7,
  },
  // `flexShrink: 1` para a lista não estourar a altura máxima do sheet e deixar
  // os últimos itens atrás do teclado.
  scroll: {
    flexShrink: 1,
  },
  submit: {
    marginTop: spacing.md,
  },
})
