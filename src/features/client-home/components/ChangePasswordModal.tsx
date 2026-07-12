import { Ionicons } from "@expo/vector-icons"
import { useEffect, useRef, useState } from "react"
import {
  KeyboardAvoidingView,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native"
import { useSafeAreaInsets } from "react-native-safe-area-context"

import { Button } from "@/components/ui/Button"
import { authClient } from "@/lib/auth-client"

import { colors, radius, spacing } from "../theme"

type Props = {
  visible: boolean
  onClose: () => void
  onSuccess: () => void
}

const MIN_LENGTH = 8

export function ChangePasswordModal({ visible, onClose, onSuccess }: Props) {
  const insets = useSafeAreaInsets()
  const newRef = useRef<TextInput>(null)
  const confirmRef = useRef<TextInput>(null)
  const [current, setCurrent] = useState("")
  const [next, setNext] = useState("")
  const [confirm, setConfirm] = useState("")
  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (visible) {
      setCurrent("")
      setNext("")
      setConfirm("")
      setError(null)
    }
  }, [visible])

  async function handleSave() {
    if (isSaving) {
      return
    }

    if (next.length < MIN_LENGTH) {
      setError(`A nova senha deve ter pelo menos ${MIN_LENGTH} caracteres.`)
      return
    }

    if (next !== confirm) {
      setError("A confirmação não corresponde à nova senha.")
      return
    }

    setIsSaving(true)
    setError(null)

    // revokeOtherSessions: encerra as demais sessões por segurança ao trocar a senha.
    const { error: authError } = await authClient.changePassword({
      currentPassword: current,
      newPassword: next,
      revokeOtherSessions: true,
    })

    setIsSaving(false)

    if (authError) {
      setError(
        authError.message ??
          "Não foi possível alterar a senha. Verifique a senha atual e tente novamente.",
      )
      return
    }

    onSuccess()
    onClose()
  }

  return (
    <Modal animationType="slide" onRequestClose={onClose} visible={visible}>
      <KeyboardAvoidingView behavior="padding" style={styles.screen}>
        <View style={[styles.header, { paddingTop: insets.top + 12 }]}>
          <Pressable
            accessibilityLabel="Fechar"
            accessibilityRole="button"
            hitSlop={8}
            onPress={onClose}
          >
            <Ionicons color={colors.textPrimary} name="close" size={24} />
          </Pressable>
          <Text style={styles.headerTitle}>Alterar senha</Text>
        </View>

        <ScrollView
          contentContainerStyle={styles.content}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <Field label="Senha atual">
            <TextInput
              autoCapitalize="none"
              onChangeText={setCurrent}
              onSubmitEditing={() => newRef.current?.focus()}
              placeholder="Sua senha atual"
              placeholderTextColor={colors.textTertiary}
              returnKeyType="next"
              secureTextEntry
              style={styles.input}
              submitBehavior="submit"
              value={current}
            />
          </Field>

          <Field label="Nova senha">
            <TextInput
              autoCapitalize="none"
              onChangeText={setNext}
              onSubmitEditing={() => confirmRef.current?.focus()}
              placeholder="Mínimo de 8 caracteres"
              placeholderTextColor={colors.textTertiary}
              ref={newRef}
              returnKeyType="next"
              secureTextEntry
              style={styles.input}
              submitBehavior="submit"
              value={next}
            />
          </Field>

          <Field label="Confirmar nova senha">
            <TextInput
              autoCapitalize="none"
              onChangeText={setConfirm}
              onSubmitEditing={handleSave}
              placeholder="Repita a nova senha"
              placeholderTextColor={colors.textTertiary}
              ref={confirmRef}
              returnKeyType="done"
              secureTextEntry
              style={styles.input}
              value={confirm}
            />
          </Field>

          {error ? <Text style={styles.error}>{error}</Text> : null}

          <Button
            disabled={isSaving}
            label={isSaving ? "Alterando..." : "Alterar senha"}
            onPress={handleSave}
            style={styles.save}
          />
        </ScrollView>
      </KeyboardAvoidingView>
    </Modal>
  )
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <View style={styles.field}>
      <Text style={styles.label}>{label}</Text>
      {children}
    </View>
  )
}

const styles = StyleSheet.create({
  content: {
    gap: 18,
    paddingBottom: 40,
    paddingHorizontal: spacing.screen,
    paddingTop: 8,
  },
  error: {
    backgroundColor: colors.dangerSoft,
    borderRadius: radius.tag,
    color: colors.danger,
    fontSize: 14,
    padding: 12,
  },
  field: {
    gap: 6,
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
  save: {
    marginTop: 4,
  },
  screen: {
    backgroundColor: colors.screenBg,
    flex: 1,
  },
})
