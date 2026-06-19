import { useFocusEffect } from "expo-router"
import { useCallback, useRef, useState } from "react"

import type { ServiceRequest } from "@/features/service-requests/types"

import {
  fetchOpportunities,
  fetchProfessionalDashboard,
  fetchProfessionalProfile,
  fetchProfessionalReviews,
} from "./service"
import type {
  ProfessionalDashboard,
  ProfessionalProfileInfo,
  ProfessionalReview,
} from "./types"

// Oportunidades (solicitações abertas compatíveis). Recarrega ao focar a tela,
// então novas solicitações de clientes aparecem ao voltar para a Home.
export function useOpportunities() {
  const [opportunities, setOpportunities] = useState<ServiceRequest[]>([])
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

    const result = await fetchOpportunities()

    if (result.ok) {
      setOpportunities(result.data)
    } else {
      setError(result.error)
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

  return { opportunities, isLoading, isRefreshing, error, refetch }
}

// Indicadores do dashboard do profissional.
export function useProfessionalDashboard() {
  const [dashboard, setDashboard] = useState<ProfessionalDashboard | null>(null)
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

    const result = await fetchProfessionalDashboard()

    if (result.ok) {
      setDashboard(result.data)
    } else {
      setError(result.error)
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

  return { dashboard, isLoading, isRefreshing, error, refetch }
}

// Dados do perfil profissional.
export function useProfessionalProfile() {
  const [profile, setProfile] = useState<ProfessionalProfileInfo | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const loadedOnce = useRef(false)

  const load = useCallback(async () => {
    if (!loadedOnce.current) {
      setIsLoading(true)
    }
    setError(null)

    const result = await fetchProfessionalProfile()

    if (result.ok) {
      setProfile(result.data)
    } else {
      setError(result.error)
    }

    loadedOnce.current = true
    setIsLoading(false)
  }, [])

  useFocusEffect(
    useCallback(() => {
      void load()
    }, [load]),
  )

  // setProfile permite refletir na hora o perfil retornado por uma alteração
  // (PATCH/PUT), sem precisar refazer a leitura.
  return { profile, isLoading, error, reload: load, setProfile }
}

// Avaliações recebidas pelo profissional.
export function useProfessionalReviews() {
  const [reviews, setReviews] = useState<ProfessionalReview[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const loadedOnce = useRef(false)

  const load = useCallback(async () => {
    if (!loadedOnce.current) {
      setIsLoading(true)
    }
    setError(null)

    const result = await fetchProfessionalReviews()

    if (result.ok) {
      setReviews(result.data)
    } else {
      setError(result.error)
    }

    loadedOnce.current = true
    setIsLoading(false)
  }, [])

  useFocusEffect(
    useCallback(() => {
      void load()
    }, [load]),
  )

  return { reviews, isLoading, error }
}
