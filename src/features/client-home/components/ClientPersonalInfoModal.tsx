import { Ionicons } from "@expo/vector-icons"
import { useEffect, useState } from "react"
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

import type { ClientProfileInfo, UpdateClientProfileInput } from "../profile-types"
import { colors, radius, spacing } from "../theme"

type Props = {
  visible: boolean
  profile: ClientProfileInfo
  onClose: () => void
  // Retorna mensagem de erro (mantém aberto) ou null em sucesso (fecha).
  onSave: (input: UpdateClientProfileInput) => Promise<string | null>
}

export function ClientPersonalInfoModal({ visible, profile, onClose, onSave }: Props) {
  const insets = useSafeAreaInsets()
  const [name, setName] = useState(profile.name)
  const [phone, setPhone] = useState(profile.phone ?? "")
  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (visible) {
      setName(profile.name)
      setPhone(profile.phone ?? "")
      setError(null)
    }
  }, [visible, profile])

  async function handleSave() {
    if (isSaving) {
      return
    }

    if (name.trim().length < 2) {
      setError("Informe seu nome completo.")
      return
    }

    setIsSaving(true)
    setError(null)

    const result = await onSave({ name: name.trim(), phone: phone.trim() || null })

    setIsSaving(false)

    if (result) {
      setError(result)
      return
    }

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
          <Text style={styles.headerTitle}>Informações pessoais</Text>
        </View>

        <ScrollView
          contentContainerStyle={styles.content}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <Field label="Nome completo">
            <TextInput
              autoCapitalize="words"
              maxLength={120}
              onChangeText={setName}
              placeholder="Seu nome"
              placeholderTextColor={colors.textTertiary}
              returnKeyType="next"
              style={styles.input}
              value={name}
            />
          </Field>

          <Field label="Telefone (opcional)">
            <TextInput
              keyboardType="phone-pad"
              maxLength={20}
              onChangeText={setPhone}
              placeholder="(48) 99999-9999"
              placeholderTextColor={colors.textTertiary}
              style={styles.input}
              value={phone}
            />
          </Field>

          <View style={styles.note}>
            <Ionicons color={colors.textSecondary} name="lock-closed-outline" size={16} />
            <Text style={styles.noteText}>
              Seu e-mail e endereço não são exibidos para outros usuários.
            </Text>
          </View>

          {error ? <Text style={styles.error}>{error}</Text> : null}

          <Button
            disabled={isSaving}
            label={isSaving ? "Salvando..." : "Salvar alterações"}
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
  note: {
    alignItems: "center",
    flexDirection: "row",
    gap: 8,
  },
  noteText: {
    color: colors.textSecondary,
    flexShrink: 1,
    fontSize: 13,
  },
  save: {
    marginTop: 4,
  },
  screen: {
    backgroundColor: colors.screenBg,
    flex: 1,
  },
})
