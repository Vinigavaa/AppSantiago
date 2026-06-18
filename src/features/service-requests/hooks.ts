import { useFocusEffect } from "expo-router"
import { useCallback, useEffect, useRef, useState } from "react"

import {
  fetchCategories,
  fetchCities,
  fetchClientSummary,
  fetchServiceRequests,
} from "./service"
import type { Category, City, ClientSummary, ServiceRequest } from "./types"

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

// Categorias e cidades para os seletores do formulário.
export function useCatalog() {
  const [categories, setCategories] = useState<Category[]>([])
  const [cities, setCities] = useState<City[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async () => {
    setIsLoading(true)
    setError(null)

    const [categoriesResult, citiesResult] = await Promise.all([
      fetchCategories(),
      fetchCities(),
    ])

    if (categoriesResult.ok) {
      setCategories(categoriesResult.data)
    } else {
      setError(categoriesResult.error)
    }

    if (citiesResult.ok) {
      setCities(citiesResult.data)
    } else if (categoriesResult.ok) {
      setError(citiesResult.error)
    }

    setIsLoading(false)
  }, [])

  useEffect(() => {
    void load()
  }, [load])

  return { categories, cities, isLoading, error, reload: load }
}
