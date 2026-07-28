import { useFocusEffect } from "expo-router"
import { useCallback, useEffect, useRef, useState } from "react"

import {
  fetchCategories,
  fetchClientSummary,
  fetchServiceRequestDetail,
  fetchServiceRequests,
} from "./service"
import type { Category, ClientSummary, ServiceRequest, ServiceRequestDetail } from "./types"

// Lista de solicitações do cliente + resumo. Recarrega ao focar a tela, então a
// solicitação recém-criada aparece imediatamente ao voltar para a Home.
export function useServiceRequests() {
  const [requests, setRequests] = useState<ServiceRequest[]>([])
  const [summary, setSummary] = useState<ClientSummary | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const loadedOnce = useRef(false)

  const load = useCallback(async (mode: "initial" | "refresh") => {
    if (mode === "refresh") {
      setIsRefreshing(true)
    } else {
      setIsLoading(true)
    }
    setError(null)

    const [requestsResult, summaryResult] = await Promise.all([
      fetchServiceRequests(),
      fetchClientSummary(),
    ])

    if (requestsResult.ok) {
      setRequests(requestsResult.data)
    } else {
      setError(requestsResult.error)
    }

    if (summaryResult.ok) {
      setSummary(summaryResult.data)
    } else if (requestsResult.ok) {
      setError(summaryResult.error)
    }

    loadedOnce.current = true
    setIsLoading(false)
    setIsRefreshing(false)
  }, [])

  useFocusEffect(
    useCallback(() => {
      void load(loadedOnce.current ? "refresh" : "initial")
    }, [load]),
  )

  const refetch = useCallback(() => load("refresh"), [load])

  return { requests, summary, isLoading, isRefreshing, error, refetch }
}

// Detalhe completo de uma solicitação. Recarrega ao focar a tela, então a
// edição feita em outra tela reflete imediatamente ao voltar.
export function useServiceRequestDetail(id: string) {
  const [request, setRequest] = useState<ServiceRequestDetail | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const loadedOnce = useRef(false)

  const load = useCallback(
    async (mode: "initial" | "refresh") => {
      if (mode === "refresh") {
        setIsRefreshing(true)
      } else {
        setIsLoading(true)
      }
      setError(null)

      const result = await fetchServiceRequestDetail(id)

      if (result.ok) {
        setRequest(result.data)
      } else {
        setError(result.error)
      }

      loadedOnce.current = true
      setIsLoading(false)
      setIsRefreshing(false)
    },
    [id],
  )

  useFocusEffect(
    useCallback(() => {
      void load(loadedOnce.current ? "refresh" : "initial")
    }, [load]),
  )

  const refetch = useCallback(() => load("refresh"), [load])

  return { request, isLoading, isRefreshing, error, refetch }
}

// Categorias para o seletor do formulário. As cidades não são mais carregadas
// em massa: o seletor de cidade busca sob demanda no servidor (CitySearchPicker).
export function useCatalog() {
  const [categories, setCategories] = useState<Category[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async () => {
    setIsLoading(true)
    setError(null)

    const result = await fetchCategories()

    if (result.ok) {
      setCategories(result.data)
    } else {
      setError(result.error)
    }

    setIsLoading(false)
  }, [])

  useEffect(() => {
    void load()
  }, [load])

  return { categories, isLoading, error, reload: load }
}
