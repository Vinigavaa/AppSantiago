import { router, useFocusEffect } from "expo-router"
import { useCallback, useEffect, useMemo, useRef } from "react"
import { StyleSheet, View } from "react-native"

import { FormScroll } from "@/components/ui/FormScroll"
import { LoadingState } from "@/components/ui/LoadingState"
import { ScreenHeader } from "@/components/ui/ScreenHeader"
import { EmptyState } from "@/features/client-home/components/EmptyState"
import { colors, spacing } from "@/features/client-home/theme"
import { RequestForm } from "@/features/service-requests/components/RequestForm"
import { useCatalog, useServiceRequestDetail } from "@/features/service-requests/hooks"
import { updateServiceRequest } from "@/features/service-requests/service"
import type { CreateServiceRequestInput } from "@/features/service-requests/types"
import { detailToFormState, useRequestForm } from "@/features/service-requests/useCreateRequestForm"

export function EditRequestScreen({ id }: { id: string }) {
  const { categories, cities, isLoading: catalogLoading, error: catalogError, reload } = useCatalog()
  const { request, isLoading: detailLoading, error: detailError } = useServiceRequestDetail(id)

  const isLoading = catalogLoading || (detailLoading && !request)

  return (
    <View style={styles.screen}>
      <ScreenHeader onBack={() => router.back()} title="Editar solicitação" />

      <FormScroll contentContainerStyle={styles.content}>
        {isLoading ? (
          <LoadingState />
        ) : catalogError || !request ? (
          <EmptyState
            actionLabel="Tentar novamente"
            description={catalogError ?? detailError ?? "Não foi possível carregar a solicitação."}
            icon="cloud-offline-outline"
            onPressAction={reload}
            title="Não foi possível carregar"
          />
        ) : (
          <EditForm categories={categories} cities={cities} detail={request} id={id} key={id} />
        )}
      </FormScroll>
    </View>
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

  const { form, errors, submitError, isSubmitting, isSuccess, setField, submit, reset } =
    useRequestForm({ onSubmit: submitEdit, initial })

  // Ao salvar com sucesso, volta ao detalhe (que recarrega ao focar e mostra os
  // dados atualizados imediatamente).
  useEffect(() => {
    if (isSuccess) {
      router.back()
    }
  }, [isSuccess])

  // A tela fica montada pelo navegador de abas. Ao sair, restauramos o form aos
  // valores atuais da solicitação — assim uma reedição não abre travada no estado
  // de "Salvando...". O ref garante que só limpamos ao sair (nunca durante o
  // refetch de foco, que não deve descartar o que o usuário está editando).
  const resetRef = useRef(reset)
  resetRef.current = reset
  useFocusEffect(useCallback(() => () => resetRef.current(), []))

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
  content: {
    gap: 18,
    paddingBottom: 40,
    paddingHorizontal: spacing.screen,
    paddingTop: 8,
  },
  screen: {
    backgroundColor: colors.screenBg,
    flex: 1,
  },
})
