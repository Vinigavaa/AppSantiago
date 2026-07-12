import { useRef } from "react"
import { StyleSheet, Text, TextInput, View } from "react-native"

import { Button } from "@/components/ui/Button"
import { colors, radius } from "@/features/client-home/theme"
import { PhotosPlaceholder } from "@/features/service-requests/components/PhotosPlaceholder"
import { SelectField } from "@/features/service-requests/components/SelectField"
import { UrgencyPicker } from "@/features/service-requests/components/UrgencyPicker"
import type { Category, City, Urgency } from "@/features/service-requests/types"

// Estado e handlers do formulário, compartilhados por criação e edição.
type FormValues = {
  categoryId: string | null
  cityId: string | null
  title: string
  description: string
  zipCode: string
  street: string
  number: string
  neighborhood: string
  complement: string
  urgency: Urgency | null
  budgetMin: string
  budgetMax: string
}

type FormErrors = Partial<Record<keyof FormValues, string>>

type Props = {
  categories: Category[]
  cities: City[]
  form: FormValues
  errors: FormErrors
  submitError: string | null
  isSubmitting: boolean
  submitLabel: string
  submittingLabel: string
  intro?: string
  onChange: <K extends keyof FormValues>(key: K, value: FormValues[K]) => void
  onSubmit: () => void
}

// Corpo do formulário de solicitação (campos + botão de envio). A tela cuida do
// cabeçalho, do carregamento do catálogo e da navegação pós-sucesso.
export function RequestForm({
  categories,
  cities,
  form,
  errors,
  submitError,
  isSubmitting,
  submitLabel,
  submittingLabel,
  intro,
  onChange,
  onSubmit,
}: Props) {
  // Refs para encadear o foco entre os campos de endereço (botão "Próximo").
  const numberRef = useRef<TextInput>(null)
  const streetRef = useRef<TextInput>(null)
  const neighborhoodRef = useRef<TextInput>(null)
  const complementRef = useRef<TextInput>(null)

  return (
    <>
      {intro ? <Text style={styles.intro}>{intro}</Text> : null}

      <SelectField
        error={errors.categoryId}
        label="Categoria"
        onSelect={(id) => onChange("categoryId", id)}
        options={categories.map((category) => ({ id: category.id, label: category.name }))}
        placeholder="Selecione a categoria"
        value={form.categoryId}
      />

      <View style={styles.field}>
        <Text style={styles.label}>Título</Text>
        <TextInput
          maxLength={120}
          onChangeText={(value) => onChange("title", value)}
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
          onChangeText={(value) => onChange("description", value)}
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
        onSelect={(id) => onChange("cityId", id)}
        options={cities.map((city) => ({ id: city.id, label: `${city.name}, ${city.state}` }))}
        placeholder="Selecione a cidade"
        searchable
        value={form.cityId}
      />

      <View style={styles.field}>
        <Text style={styles.label}>Endereço do serviço</Text>
        <Text style={styles.helper}>
          Antes da contratação, os profissionais veem apenas bairro e cidade. O endereço completo
          só é liberado ao profissional contratado.
        </Text>

        <View style={styles.addressRow}>
          <View style={styles.addressZip}>
            <TextInput
              keyboardType="number-pad"
              maxLength={9}
              onChangeText={(value) => onChange("zipCode", value)}
              onSubmitEditing={() => numberRef.current?.focus()}
              placeholder="CEP"
              placeholderTextColor={colors.textTertiary}
              returnKeyType="next"
              style={[styles.input, errors.zipCode && styles.inputError]}
              submitBehavior="submit"
              value={form.zipCode}
            />
          </View>
          <View style={styles.addressNumber}>
            <TextInput
              keyboardType="number-pad"
              maxLength={20}
              onChangeText={(value) => onChange("number", value)}
              onSubmitEditing={() => streetRef.current?.focus()}
              placeholder="Número"
              placeholderTextColor={colors.textTertiary}
              ref={numberRef}
              returnKeyType="next"
              style={[styles.input, errors.number && styles.inputError]}
              submitBehavior="submit"
              value={form.number}
            />
          </View>
        </View>
        {errors.zipCode ? <Text style={styles.error}>{errors.zipCode}</Text> : null}
        {errors.number ? <Text style={styles.error}>{errors.number}</Text> : null}

        <TextInput
          maxLength={160}
          onChangeText={(value) => onChange("street", value)}
          onSubmitEditing={() => neighborhoodRef.current?.focus()}
          placeholder="Rua / Avenida"
          placeholderTextColor={colors.textTertiary}
          ref={streetRef}
          returnKeyType="next"
          style={[styles.input, errors.street && styles.inputError]}
          submitBehavior="submit"
          value={form.street}
        />
        {errors.street ? <Text style={styles.error}>{errors.street}</Text> : null}

        <TextInput
          maxLength={120}
          onChangeText={(value) => onChange("neighborhood", value)}
          onSubmitEditing={() => complementRef.current?.focus()}
          placeholder="Bairro"
          placeholderTextColor={colors.textTertiary}
          ref={neighborhoodRef}
          returnKeyType="next"
          style={[styles.input, errors.neighborhood && styles.inputError]}
          submitBehavior="submit"
          value={form.neighborhood}
        />
        {errors.neighborhood ? <Text style={styles.error}>{errors.neighborhood}</Text> : null}

        <TextInput
          maxLength={120}
          onChangeText={(value) => onChange("complement", value)}
          placeholder="Complemento (opcional)"
          placeholderTextColor={colors.textTertiary}
          ref={complementRef}
          returnKeyType="done"
          style={styles.input}
          value={form.complement}
        />
      </View>

      <UrgencyPicker
        error={errors.urgency}
        onSelect={(urgency) => onChange("urgency", urgency)}
        value={form.urgency}
      />

      <View style={styles.field}>
        <Text style={styles.label}>
          Faixa de orçamento <Text style={styles.optional}>(opcional)</Text>
        </Text>
        <View style={styles.budgetRow}>
          <View style={styles.budgetField}>
            <TextInput
              keyboardType="decimal-pad"
              onChangeText={(value) => onChange("budgetMin", value)}
              placeholder="Mínimo"
              placeholderTextColor={colors.textTertiary}
              style={[styles.input, errors.budgetMin && styles.inputError]}
              value={form.budgetMin}
            />
          </View>
          <View style={styles.budgetField}>
            <TextInput
              keyboardType="decimal-pad"
              onChangeText={(value) => onChange("budgetMax", value)}
              placeholder="Máximo"
              placeholderTextColor={colors.textTertiary}
              returnKeyType="done"
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
        label={isSubmitting ? submittingLabel : submitLabel}
        onPress={onSubmit}
        style={styles.submitButton}
      />
    </>
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
  budgetField: {
    flex: 1,
  },
  budgetRow: {
    flexDirection: "row",
    gap: 10,
  },
  error: {
    color: colors.danger,
    fontSize: 13,
  },
  field: {
    gap: 6,
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
  submitButton: {
    marginTop: 4,
  },
  submitError: {
    backgroundColor: colors.dangerSoft,
    borderRadius: radius.tag,
    color: colors.danger,
    fontSize: 14,
    padding: 12,
  },
  textArea: {
    height: 120,
    paddingTop: 12,
    textAlignVertical: "top",
  },
})
