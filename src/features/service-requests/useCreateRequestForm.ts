import { useState } from "react"

import type { ApiResult } from "@/lib/api-client"

import type { CreateServiceRequestInput, ServiceRequestDetail, Urgency } from "./types"

type FormState = {
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

type FormErrors = Partial<Record<keyof FormState, string>>

const INITIAL_STATE: FormState = {
  categoryId: null,
  cityId: null,
  title: "",
  description: "",
  zipCode: "",
  street: "",
  number: "",
  neighborhood: "",
  complement: "",
  urgency: null,
  budgetMin: "",
  budgetMax: "",
}

// Converte um detalhe existente no estado inicial do formulário (para edição).
export function detailToFormState(detail: ServiceRequestDetail): FormState {
  return {
    categoryId: detail.category.id,
    cityId: detail.city.id,
    title: detail.title,
    description: detail.description,
    zipCode: detail.address.zipCode ?? "",
    street: detail.address.street ?? "",
    number: detail.address.number ?? "",
    neighborhood: detail.address.neighborhood ?? "",
    complement: detail.address.complement ?? "",
    urgency: detail.urgency,
    budgetMin: detail.budgetMin !== null ? String(detail.budgetMin) : "",
    budgetMax: detail.budgetMax !== null ? String(detail.budgetMax) : "",
  }
}

const ZIP_CODE_REGEX = /^\d{5}-?\d{3}$/

// Converte "1.200,50" / "1200" em número; null quando vazio, NaN quando inválido.
function parseCurrency(value: string): number | null | typeof NaN {
  const trimmed = value.trim()

  if (!trimmed) {
    return null
  }

  const normalized = trimmed.replace(/\./g, "").replace(",", ".")
  const parsed = Number(normalized)

  return Number.isFinite(parsed) ? parsed : NaN
}

type UseRequestFormOptions = {
  // Ação de persistência (criar ou editar). Só precisamos do ok/erro.
  onSubmit: (input: CreateServiceRequestInput) => Promise<ApiResult<unknown>>
  initial?: FormState
}

export function useRequestForm({ onSubmit, initial }: UseRequestFormOptions) {
  const [form, setForm] = useState<FormState>(initial ?? INITIAL_STATE)
  const [errors, setErrors] = useState<FormErrors>({})
  const [submitError, setSubmitError] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isSuccess, setIsSuccess] = useState(false)

  function setField<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((current) => ({ ...current, [key]: value }))
    setErrors((current) => (current[key] ? { ...current, [key]: undefined } : current))
    setSubmitError(null)
  }

  // Validação local apenas para feedback imediato. A validação oficial é do backend.
  function validate(): { input: CreateServiceRequestInput; valid: true } | { valid: false } {
    const nextErrors: FormErrors = {}

    if (!form.categoryId) {
      nextErrors.categoryId = "Selecione uma categoria."
    }

    if (!form.cityId) {
      nextErrors.cityId = "Selecione uma cidade."
    }

    const title = form.title.trim()
    if (title.length < 5) {
      nextErrors.title = "O título precisa ter ao menos 5 caracteres."
    }

    const description = form.description.trim()
    if (description.length < 20) {
      nextErrors.description = "Descreva o serviço com ao menos 20 caracteres."
    }

    if (!ZIP_CODE_REGEX.test(form.zipCode.trim())) {
      nextErrors.zipCode = "Informe um CEP válido."
    }

    if (form.street.trim().length < 3) {
      nextErrors.street = "Informe a rua."
    }

    if (!form.number.trim()) {
      nextErrors.number = "Informe o número."
    }

    if (form.neighborhood.trim().length < 2) {
      nextErrors.neighborhood = "Informe o bairro."
    }

    if (!form.urgency) {
      nextErrors.urgency = "Informe quando precisa do serviço."
    }

    const budgetMin = parseCurrency(form.budgetMin)
    const budgetMax = parseCurrency(form.budgetMax)

    if (Number.isNaN(budgetMin)) {
      nextErrors.budgetMin = "Informe um valor válido."
    }

    if (Number.isNaN(budgetMax)) {
      nextErrors.budgetMax = "Informe um valor válido."
    }

    if (
      typeof budgetMin === "number" &&
      typeof budgetMax === "number" &&
      budgetMax < budgetMin
    ) {
      nextErrors.budgetMax = "O valor máximo deve ser maior ou igual ao mínimo."
    }

    setErrors(nextErrors)

    if (Object.keys(nextErrors).length > 0) {
      return { valid: false }
    }

    return {
      valid: true,
      input: {
        categoryId: form.categoryId as string,
        cityId: form.cityId as string,
        title,
        description,
        zipCode: form.zipCode.trim(),
        street: form.street.trim(),
        number: form.number.trim(),
        neighborhood: form.neighborhood.trim(),
        complement: form.complement.trim() || undefined,
        urgency: form.urgency as Urgency,
        budgetMin: typeof budgetMin === "number" ? budgetMin : undefined,
        budgetMax: typeof budgetMax === "number" ? budgetMax : undefined,
      },
    }
  }

  async function submit() {
    // Evita envios duplicados (multi-clique) e reenvio após sucesso.
    if (isSubmitting || isSuccess) {
      return
    }

    const validation = validate()

    if (!validation.valid) {
      return
    }

    setIsSubmitting(true)
    setSubmitError(null)

    const result = await onSubmit(validation.input)

    if (!result.ok) {
      setIsSubmitting(false)
      setSubmitError(result.error)
      return
    }

    // Mantém isSubmitting travado e sinaliza sucesso. A navegação (para a Home,
    // no caso de criação, ou de volta ao detalhe, na edição) fica a cargo da tela.
    setIsSuccess(true)
  }

  return { form, errors, submitError, isSubmitting, isSuccess, setField, submit }
}
