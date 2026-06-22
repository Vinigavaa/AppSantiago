import { useFocusEffect } from "expo-router"
import { useCallback, useRef, useState } from "react"

import { fetchReceivedProposals } from "./service"
import type { ReceivedProposal } from "./types"

// Propostas recebidas pelo cliente. Recarrega ao focar a tela, então propostas
// novas aparecem assim que o cliente volta para a aba.
export function useReceivedProposals() {
  const [proposals, setProposals] = useState<ReceivedProposal[]>([])
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

    const result = await fetchReceivedProposals()

    if (result.ok) {
      setProposals(result.data)
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

  return { proposals, isLoading, isRefreshing, error, refetch }
}
