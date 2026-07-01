import { Ionicons } from "@expo/vector-icons"
import { router } from "expo-router"
import { useEffect, useMemo } from "react"
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native"
import { useSafeAreaInsets } from "react-native-safe-area-context"

import { Button } from "@/components/ui/Button"
import { colors, spacing } from "@/features/client-home/theme"
import { RequestForm } from "@/features/service-requests/components/RequestForm"
import { useCatalog, useServiceRequestDetail } from "@/features/service-requests/hooks"
import { updateServiceRequest } from "@/features/service-requests/service"
import type { CreateServiceRequestInput } from "@/features/service-requests/types"
import { detailToFormState, useRequestForm } from "@/features/service-requests/useCreateRequestForm"

export function EditRequestScreen({ id }: { id: string }) {
  const insets = useSafeAreaInsets()
  const { categories, cities, isLoading: catalogLoading, error: catalogError, reload } = useCatalog()
  const { request, isLoading: detailLoading, error: detailError } = useServiceRequestDetail(id)

  const isLoading = catalogLoading || (detailLoading && !request)

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : undefined}
      style={styles.screen}
    >
      <View style={[styles.header, { paddingTop: insets.top + 12 }]}>
        <Pressable
          accessibilityLabel="Voltar"
          accessibilityRole="button"
          hitSlop={8}
          onPress={() => router.back()}
          style={({ pressed }) => [styles.backButton, pressed && styles.pressed]}
        >
          <Ionicons color={colors.textPrimary} name="chevron-back" size={22} />
        </Pressable>
        <Text style={styles.headerTitle}>Editar solicitação</Text>
      </View>

      <ScrollView
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {isLoading ? (
          <View style={styles.centered}>
            <ActivityIndicator color={colors.accent} />
          </View>
        ) : catalogError || !request ? (
          <View style={styles.centered}>
            <Text style={styles.errorText}>
              {catalogError ?? detailError ?? "Não foi possível carregar a solicitação."}
            </Text>
            <Button label="Tentar novamente" onPress={reload} style={styles.retry} variant="secondary" />
          </View>
        ) : (
          <EditForm categories={categories} cities={cities} detail={request} id={id} />
        )}
      </ScrollView>
    </KeyboardAvoidingView>
  )
}

// Formulário só é montado quando o detalhe já chegou, para inicializar o estado
// com os valores atuais uma única vez.
function EditForm({
  categories,
  cities,
  id,
  detail,
}: {
  categories: ReturnType<typeof useCatalog>["categories"]
  cities: ReturnType<typeof useCatalog>["cities"]
  id: string
  detail: NonNullable<ReturnType<typeof useServiceRequestDetail>["request"]>
}) {
  const initial = useMemo(() => detailToFormState(detail), [detail])

  const submitEdit = useMemo(
    () => (input: CreateServiceRequestInput) => updateServiceRequest(id, input),
    [id],
  )

  const { form, errors, submitError, isSubmitting, isSuccess, setField, submit } = useRequestForm({
    onSubmit: submitEdit,
    initial,
  })

  // Ao salvar com sucesso, volta ao detalhe (que recarrega ao focar e mostra os
  // dados atualizados imediatamente).
  useEffect(() => {
    if (isSuccess) {
      router.back()
    }
  }, [isSuccess])

  return (
    <RequestForm
      categories={categories}
      cities={cities}
      errors={errors}
      form={form}
      isSubmitting={isSubmitting}
      onChange={setField}
      onSubmit={submit}
      submitLabel="Salvar alterações"
      submitError={submitError}
      submittingLabel="Salvando..."
    />
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
  centered: {
    alignItems: "center",
    gap: 14,
    paddingVertical: 60,
  },
  content: {
    gap: 18,
    paddingBottom: 40,
    paddingHorizontal: spacing.screen,
    paddingTop: 8,
  },
  errorText: {
    color: colors.textSecondary,
    fontSize: 14,
    textAlign: "center",
  },
  header: {
    alignItems: "center",
    backgroundColor: colors.screenBg,
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
  pressed: {
    opacity: 0.7,
  },
  retry: {
    paddingHorizontal: 24,
  },
  screen: {
    backgroundColor: colors.screenBg,
    flex: 1,
  },
})
