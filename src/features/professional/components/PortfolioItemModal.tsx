import { Ionicons } from "@expo/vector-icons"
import { useEffect, useRef, useState } from "react"
import {
  Image,
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
import { colors, radius, spacing } from "@/features/client-home/theme"
import { uploadPortfolioImage } from "@/features/uploads/portfolioUpload"

import { createPortfolioItem } from "../service"
import type { PortfolioItem } from "../types"

type Props = {
  // Quando não-nulo, o modal abre com a imagem escolhida em preview.
  uri: string | null
  onClose: () => void
  onCreated: (item: PortfolioItem) => void
}

export function PortfolioItemModal({ uri, onClose, onCreated }: Props) {
  const insets = useSafeAreaInsets()
  const descriptionRef = useRef<TextInput>(null)
  const [title, setTitle] = useState("")
  const [description, setDescription] = useState("")
  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (uri) {
      setTitle("")
      setDescription("")
      setError(null)
    }
  }, [uri])

  async function handleSave() {
    if (isSaving || !uri) {
      return
    }

    if (title.trim().length < 2) {
      setError("Informe um título para o trabalho.")
      return
    }

    setIsSaving(true)
    setError(null)

    const uploaded = await uploadPortfolioImage(uri)

    if (!uploaded.ok) {
      setIsSaving(false)
      setError(uploaded.error)
      return
    }

    const result = await createPortfolioItem({
      title: title.trim(),
      description: description.trim() || null,
      photo: uploaded.data,
    })

    setIsSaving(false)

    if (!result.ok) {
      setError(result.error)
      return
    }

    onCreated(result.data)
    onClose()
  }

  return (
    <Modal animationType="slide" onRequestClose={onClose} visible={uri !== null}>
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
          <Text style={styles.headerTitle}>Adicionar ao portfólio</Text>
        </View>

        <ScrollView
          contentContainerStyle={styles.content}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {uri ? <Image source={{ uri }} style={styles.preview} /> : null}

          <View style={styles.field}>
            <Text style={styles.label}>Título</Text>
            <TextInput
              autoCapitalize="sentences"
              maxLength={80}
              onChangeText={setTitle}
              onSubmitEditing={() => descriptionRef.current?.focus()}
              placeholder="Ex: Reforma de cozinha"
              placeholderTextColor={colors.textTertiary}
              returnKeyType="next"
              style={styles.input}
              submitBehavior="submit"
              value={title}
            />
          </View>

          <View style={styles.field}>
            <Text style={styles.label}>Descrição (opcional)</Text>
            <TextInput
              maxLength={500}
              multiline
              onChangeText={setDescription}
              placeholder="Conte detalhes do trabalho."
              placeholderTextColor={colors.textTertiary}
              ref={descriptionRef}
              style={[styles.input, styles.textArea]}
              value={description}
            />
          </View>

          {error ? <Text style={styles.error}>{error}</Text> : null}

          <Button
            disabled={isSaving}
            label={isSaving ? "Salvando..." : "Adicionar"}
            onPress={handleSave}
            style={styles.save}
          />
        </ScrollView>
      </KeyboardAvoidingView>
    </Modal>
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
  preview: {
    aspectRatio: 1,
    backgroundColor: colors.iconMutedBg,
    borderRadius: radius.card,
    width: "100%",
  },
  save: {
    marginTop: 4,
  },
  screen: {
    backgroundColor: colors.screenBg,
    flex: 1,
  },
  textArea: {
    height: 100,
    paddingTop: 12,
    textAlignVertical: "top",
  },
})
