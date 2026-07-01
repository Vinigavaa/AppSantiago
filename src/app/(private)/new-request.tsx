import { Ionicons } from "@expo/vector-icons"
import { router, useFocusEffect } from "expo-router"
import { useCallback, useEffect } from "react"
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
import { routes } from "@/constants/routes"
import { colors, radius, spacing } from "@/features/client-home/theme"
import { RequestForm } from "@/features/service-requests/components/RequestForm"
import { useCatalog } from "@/features/service-requests/hooks"
import { createServiceRequest } from "@/features/service-requests/service"
import { useRequestForm } from "@/features/service-requests/useCreateRequestForm"

export default function NewRequest() {
  const insets = useSafeAreaInsets()
  const { categories, cities, isLoading, error: catalogError, reload } = useCatalog()
  const { form, errors, submitError, isSubmitting, isSuccess, setField, submit, reset } =
    useRequestForm({ onSubmit: createServiceRequest })

  // A tela é mantida montada pelo navegador de abas. Ao sair (inclusive após o
  // sucesso), limpamos o formulário para que a próxima abertura mostre um form
  // vazio — e não a tela de "Solicitação publicada".
  useFocusEffect(useCallback(() => () => reset(), [reset]))

  // Após o sucesso, mostra a confirmação e segue para a área de solicitações.
  useEffect(() => {
    if (!isSuccess) {
      return
    }

    const timeoutId = setTimeout(() => router.replace(routes.home), 1100)

    return () => clearTimeout(timeoutId)
  }, [isSuccess])

  if (isSuccess) {
    return <SuccessView insetsTop={insets.top} />
  }

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
        <Text style={styles.headerTitle}>Nova solicitação</Text>
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
        ) : catalogError ? (
          <View style={styles.centered}>
            <Text style={styles.catalogError}>{catalogError}</Text>
            <Button label="Tentar novamente" onPress={reload} style={styles.retryButton} />
          </View>
        ) : (
          <RequestForm
            categories={categories}
            cities={cities}
            errors={errors}
            form={form}
            intro="Descreva o serviço que precisa. Profissionais próximos poderão enviar propostas."
            isSubmitting={isSubmitting}
            onChange={setField}
            onSubmit={submit}
            submitLabel="Publicar solicitação"
            submitError={submitError}
            submittingLabel="Publicando..."
          />
        )}
      </ScrollView>
    </KeyboardAvoidingView>
  )
}

function SuccessView({ insetsTop }: { insetsTop: number }) {
  return (
    <View style={[styles.successContainer, { paddingTop: insetsTop + 80 }]}>
      <View style={styles.successIcon}>
        <Ionicons color={colors.accent} name="checkmark" size={40} />
      </View>
      <Text style={styles.successTitle}>Solicitação publicada!</Text>
      <Text style={styles.successText}>
        Sua solicitação já está disponível para os profissionais.
      </Text>
    </View>
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
  catalogError: {
    color: colors.textSecondary,
    fontSize: 14,
    textAlign: "center",
  },
  centered: {
    alignItems: "center",
    gap: 12,
    paddingVertical: 48,
  },
  content: {
    gap: 18,
    paddingBottom: 40,
    paddingHorizontal: spacing.screen,
    paddingTop: 8,
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
  retryButton: {
    paddingHorizontal: 24,
  },
  screen: {
    backgroundColor: colors.screenBg,
    flex: 1,
  },
  successContainer: {
    alignItems: "center",
    backgroundColor: colors.screenBg,
    flex: 1,
    paddingHorizontal: 32,
  },
  successIcon: {
    alignItems: "center",
    backgroundColor: colors.accentSoftBg,
    borderRadius: 999,
    height: 80,
    justifyContent: "center",
    marginBottom: 20,
    width: 80,
  },
  successText: {
    color: colors.textSecondary,
    fontSize: 15,
    lineHeight: 22,
    marginTop: 8,
    textAlign: "center",
  },
  successTitle: {
    color: colors.textPrimary,
    fontSize: 22,
    fontWeight: "700",
    textAlign: "center",
  },
})
