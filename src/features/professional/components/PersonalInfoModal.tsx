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

import type { ProfessionalProfileInfo, UpdateProfileInput } from "../types"

type Props = {
  visible: boolean
  profile: ProfessionalProfileInfo
  onClose: () => void
  // Retorna mensagem de erro (mantém aberto) ou null em sucesso (fecha).
  onSave: (input: UpdateProfileInput) => Promise<string | null>
}

export function PersonalInfoModal({ visible, profile, onClose, onSave }: Props) {
  const insets = useSafeAreaInsets()
  const [name, setName] = useState(profile.name)
  const [displayName, setDisplayName] = useState(profile.displayName ?? "")
  const [phone, setPhone] = useState(profile.phone ?? "")
  const [bio, setBio] = useState(profile.bio ?? "")
  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (visible) {
      setName(profile.name)
      setDisplayName(profile.displayName ?? "")
      setPhone(profile.phone ?? "")
      setBio(profile.bio ?? "")
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

    const result = await onSave({
      name: name.trim(),
      displayName: displayName.trim() || null,
      phone: phone.trim() || null,
      bio: bio.trim() || null,
    })

    setIsSaving(false)

    if (result) {
      setError(result)
      return
    }

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
          <Text style={styles.headerTitle}>Informações pessoais</Text>
        </View>

        <ScrollView
          contentContainerStyle={styles.content}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <Field label="Nome completo">
            <TextInput
              maxLength={120}
              onChangeText={setName}
              placeholder="Seu nome"
              placeholderTextColor={colors.textTertiary}
              style={styles.input}
              value={name}
            />
          </Field>

          <Field label="Nome de exibição (opcional)">
            <TextInput
              maxLength={60}
              onChangeText={setDisplayName}
              placeholder="Como deseja ser chamado"
              placeholderTextColor={colors.textTertiary}
              style={styles.input}
              value={displayName}
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

          <Field label="Descrição profissional (opcional)">
            <TextInput
              maxLength={600}
              multiline
              onChangeText={setBio}
              placeholder="Conte sua experiência e o que você oferece."
              placeholderTextColor={colors.textTertiary}
              style={[styles.input, styles.textArea]}
              value={bio}
            />
            <Text style={styles.helper}>
              Será exibida no seu perfil público para os clientes.
            </Text>
          </Field>

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
    backgroundColor: "#FCE8E8",
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
  helper: {
    color: colors.textTertiary,
    fontSize: 12,
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
  textArea: {
    height: 120,
    paddingTop: 12,
    textAlignVertical: "top",
  },
})
