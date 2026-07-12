import { useFocusEffect } from "expo-router"
import { useCallback, useRef, useState } from "react"

import { fetchClientProfile, fetchClientReviews } from "./profile-service"
import type { ClientProfileInfo, ClientReview } from "./profile-types"

// Perfil do cliente. Recarrega ao focar a tela; setProfile reflete na hora o
// perfil retornado por uma edição (PATCH), sem refazer a leitura.
export function useClientProfile() {
  const [profile, setProfile] = useState<ClientProfileInfo | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const loadedOnce = useRef(false)

  const load = useCallback(async () => {
    if (!loadedOnce.current) {
      setIsLoading(true)
    }
    setError(null)

    const result = await fetchClientProfile()

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

  return { profile, isLoading, error, reload: load, setProfile }
}

// Avaliações recebidas pelo cliente.
export function useClientReviews() {
  const [reviews, setReviews] = useState<ClientReview[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const loadedOnce = useRef(false)

  const load = useCallback(async () => {
    if (!loadedOnce.current) {
      setIsLoading(true)
    }
    setError(null)

    const result = await fetchClientReviews()

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
