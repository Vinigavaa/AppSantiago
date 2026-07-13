import { Ionicons } from "@expo/vector-icons"
import { router, useFocusEffect, useLocalSearchParams } from "expo-router"
import { useCallback, useEffect } from "react"
import { StyleSheet, Text, View } from "react-native"
import { useSafeAreaInsets } from "react-native-safe-area-context"

import { Button } from "@/components/ui/Button"
import { FormScroll } from "@/components/ui/FormScroll"
import { LoadingState } from "@/components/ui/LoadingState"
import { ScreenHeader } from "@/components/ui/ScreenHeader"
import { routes } from "@/constants/routes"
import { colors, radius, spacing } from "@/features/client-home/theme"
import { RequestForm } from "@/features/service-requests/components/RequestForm"
import { useCatalog } from "@/features/service-requests/hooks"
import { createServiceRequest } from "@/features/service-requests/service"
import { useRequestForm } from "@/features/service-requests/useCreateRequestForm"
import { useRequestPhotos } from "@/features/service-requests/useRequestPhotos"

export default function NewRequest() {
  const insets = useSafeAreaInsets()
  // Quando chega da busca de profissionais, a categoria vem pré-selecionada.
  const { categoryId } = useLocalSearchParams<{ categoryId?: string }>()
  const { categories, cities, isLoading, error: catalogError, reload } = useCatalog()
  const photos = useRequestPhotos([])
  const { form, errors, submitError, isSubmitting, isSuccess, setField, submit, reset } =
    useRequestForm({
      onSubmit: createServiceRequest,
      getExtraInput: () => ({ photos: photos.getPayload().photos }),
    })

  // A tela é mantida montada pelo navegador de abas. Ao focar, pré-seleciona a
  // categoria recebida (se houver); ao sair (inclusive após o sucesso), limpa o
  // formulário para que a próxima abertura sem parâmetro comece vazia.
  useFocusEffect(
    useCallback(() => {
      if (categoryId) {
        setField("categoryId", categoryId)
      }
      return () => {
        reset()
        photos.reset()
      }
      // setField é estável na prática (envolve setState); depende só do parâmetro.
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [categoryId, reset, photos.reset]),
  )

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
    <View style={styles.screen}>
      <ScreenHeader onBack={() => router.back()} title="Nova solicitação" />

      <FormScroll contentContainerStyle={styles.content}>
        {isLoading ? (
          <LoadingState />
        ) : catalogError ? (
          <View style={styles.centered}>
            <Text style={styles.catalogError}>{catalogError}</Text>
            <Button label="Tentar novamente" onPress={reload} style={styles.retryButton} />
          </View>
        ) : (
          <RequestForm
            canAddPhotos={photos.canAddMore}
            categories={categories}
            cities={cities}
            errors={errors}
            form={form}
            intro="Descreva o serviço que precisa. Profissionais próximos poderão enviar propostas."
            isSubmitting={isSubmitting}
            onAddPhotos={photos.addPhotos}
            onChange={setField}
            onRemovePhoto={photos.removePhoto}
            onRetryPhoto={photos.retryPhoto}
            onSubmit={submit}
            photos={photos.items}
            photosUploading={photos.isUploading}
            submitLabel="Publicar solicitação"
            submitError={submitError}
            submittingLabel="Publicando..."
          />
        )}
      </FormScroll>
    </View>
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
