import { Ionicons } from "@expo/vector-icons"
import { router } from "expo-router"
import { useEffect } from "react"
import {
  ActivityIndicator,
  KeyboardAvoidingView,
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
import { routes } from "@/constants/routes"
import { colors, radius, spacing } from "@/features/client-home/theme"
import { PhotosPlaceholder } from "@/features/service-requests/components/PhotosPlaceholder"
import { SelectField } from "@/features/service-requests/components/SelectField"
import { UrgencyPicker } from "@/features/service-requests/components/UrgencyPicker"
import { useCatalog } from "@/features/service-requests/hooks"
import { useCreateRequestForm } from "@/features/service-requests/useCreateRequestForm"

export default function NewRequest() {
  const insets = useSafeAreaInsets()
  const { categories, cities, isLoading, error: catalogError, reload } = useCatalog()
  const { form, errors, submitError, isSubmitting, isSuccess, setField, submit } =
    useCreateRequestForm()

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
          <>
            <Text style={styles.intro}>
              Descreva o serviço que precisa. Profissionais próximos poderão enviar propostas.
            </Text>

            <SelectField
              error={errors.categoryId}
              label="Categoria"
              onSelect={(id) => setField("categoryId", id)}
              options={categories.map((category) => ({ id: category.id, label: category.name }))}
              placeholder="Selecione a categoria"
              value={form.categoryId}
            />

            <View style={styles.field}>
              <Text style={styles.label}>Título</Text>
              <TextInput
                maxLength={120}
                onChangeText={(value) => setField("title", value)}
                placeholder="Ex: Pintar apartamento de 2 quartos"
                placeholderTextColor={colors.textTertiary}
                style={[styles.input, errors.title && styles.inputError]}
                value={form.title}
              />
              {errors.title ? <Text style={styles.error}>{errors.title}</Text> : null}
            </View>

            <View style={styles.field}>
              <Text style={styles.label}>Descrição</Text>
              <TextInput
                maxLength={2000}
                multiline
                onChangeText={(value) => setField("description", value)}
                placeholder="Detalhe o que precisa ser feito, tamanho, materiais, etc."
                placeholderTextColor={colors.textTertiary}
                style={[styles.input, styles.textArea, errors.description && styles.inputError]}
                value={form.description}
              />
              {errors.description ? <Text style={styles.error}>{errors.description}</Text> : null}
            </View>

            <SelectField
              error={errors.cityId}
              label="Cidade"
              onSelect={(id) => setField("cityId", id)}
              options={cities.map((city) => ({
                id: city.id,
                label: `${city.name}, ${city.state}`,
              }))}
              placeholder="Selecione a cidade"
              searchable
              value={form.cityId}
            />

            <View style={styles.field}>
              <Text style={styles.label}>Endereço do serviço</Text>
              <Text style={styles.helper}>
                Antes da contratação, os profissionais veem apenas bairro e cidade. O endereço
                completo só é liberado ao profissional contratado.
              </Text>

              <View style={styles.addressRow}>
                <View style={styles.addressZip}>
                  <TextInput
                    keyboardType="numeric"
                    maxLength={9}
                    onChangeText={(value) => setField("zipCode", value)}
                    placeholder="CEP"
                    placeholderTextColor={colors.textTertiary}
                    style={[styles.input, errors.zipCode && styles.inputError]}
                    value={form.zipCode}
                  />
                </View>
                <View style={styles.addressNumber}>
                  <TextInput
                    maxLength={20}
                    onChangeText={(value) => setField("number", value)}
                    placeholder="Número"
                    placeholderTextColor={colors.textTertiary}
                    style={[styles.input, errors.number && styles.inputError]}
                    value={form.number}
                  />
                </View>
              </View>
              {errors.zipCode ? <Text style={styles.error}>{errors.zipCode}</Text> : null}
              {errors.number ? <Text style={styles.error}>{errors.number}</Text> : null}

              <TextInput
                maxLength={160}
                onChangeText={(value) => setField("street", value)}
                placeholder="Rua / Avenida"
                placeholderTextColor={colors.textTertiary}
                style={[styles.input, errors.street && styles.inputError]}
                value={form.street}
              />
              {errors.street ? <Text style={styles.error}>{errors.street}</Text> : null}

              <TextInput
                maxLength={120}
                onChangeText={(value) => setField("neighborhood", value)}
                placeholder="Bairro"
                placeholderTextColor={colors.textTertiary}
                style={[styles.input, errors.neighborhood && styles.inputError]}
                value={form.neighborhood}
              />
              {errors.neighborhood ? <Text style={styles.error}>{errors.neighborhood}</Text> : null}

              <TextInput
                maxLength={120}
                onChangeText={(value) => setField("complement", value)}
                placeholder="Complemento (opcional)"
                placeholderTextColor={colors.textTertiary}
                style={styles.input}
                value={form.complement}
              />
            </View>

            <UrgencyPicker
              error={errors.urgency}
              onSelect={(urgency) => setField("urgency", urgency)}
              value={form.urgency}
            />

            <View style={styles.field}>
              <Text style={styles.label}>
                Faixa de orçamento <Text style={styles.optional}>(opcional)</Text>
              </Text>
              <View style={styles.budgetRow}>
                <View style={styles.budgetField}>
                  <TextInput
                    keyboardType="numeric"
                    onChangeText={(value) => setField("budgetMin", value)}
                    placeholder="Mínimo"
                    placeholderTextColor={colors.textTertiary}
                    style={[styles.input, errors.budgetMin && styles.inputError]}
                    value={form.budgetMin}
                  />
                </View>
                <View style={styles.budgetField}>
                  <TextInput
                    keyboardType="numeric"
                    onChangeText={(value) => setField("budgetMax", value)}
                    placeholder="Máximo"
                    placeholderTextColor={colors.textTertiary}
                    style={[styles.input, errors.budgetMax && styles.inputError]}
                    value={form.budgetMax}
                  />
                </View>
              </View>
              {errors.budgetMin ? <Text style={styles.error}>{errors.budgetMin}</Text> : null}
              {errors.budgetMax ? <Text style={styles.error}>{errors.budgetMax}</Text> : null}
            </View>

            <PhotosPlaceholder />

            {submitError ? <Text style={styles.submitError}>{submitError}</Text> : null}

            <Button
              disabled={isSubmitting}
              label={isSubmitting ? "Publicando..." : "Publicar solicitação"}
              onPress={submit}
              style={styles.submitButton}
            />
          </>
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
  addressNumber: {
    flex: 1,
  },
  addressRow: {
    flexDirection: "row",
    gap: 10,
  },
  addressZip: {
    flex: 1.2,
  },
  backButton: {
    alignItems: "center",
    backgroundColor: colors.iconMutedBg,
    borderRadius: 999,
    height: 40,
    justifyContent: "center",
    width: 40,
  },
  budgetField: {
    flex: 1,
  },
  budgetRow: {
    flexDirection: "row",
    gap: 10,
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
  error: {
    color: colors.danger,
    fontSize: 13,
  },
  field: {
    gap: 6,
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
  inputError: {
    borderColor: colors.danger,
  },
  intro: {
    color: colors.textSecondary,
    fontSize: 14,
    lineHeight: 20,
  },
  label: {
    color: colors.textPrimary,
    fontSize: 14,
    fontWeight: "600",
  },
  optional: {
    color: colors.textTertiary,
    fontWeight: "400",
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
  submitButton: {
    marginTop: 4,
  },
  submitError: {
    backgroundColor: "#FCE8E8",
    borderRadius: radius.tag,
    color: colors.danger,
    fontSize: 14,
    padding: 12,
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
  textArea: {
    height: 120,
    paddingTop: 12,
    textAlignVertical: "top",
  },
})
