import { useFocusEffect } from "expo-router"
import { useCallback, useEffect, useRef, useState } from "react"

import { authClient } from "@/lib/auth-client"

import {
  configurePurchases,
  getPlanOffers,
  isPurchasesConfigured,
  purchasePlan,
  restorePurchases,
  type PlanOffer,
} from "./purchases"
import { fetchSubscriptionState, restoreSubscription, syncSubscription } from "./service"
import type { SubscriptionPlan, SubscriptionState } from "./types"

// Estado + ações da assinatura para a tela do profissional. Mantém a regra de ouro:
// a compra abre a loja, mas quem libera as vantagens é sempre o servidor (sync).
export function useSubscription() {
  const { data: session } = authClient.useSession()
  const userId = session?.user.id

  const [state, setState] = useState<SubscriptionState | null>(null)
  const [offers, setOffers] = useState<PlanOffer[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [busyPlan, setBusyPlan] = useState<SubscriptionPlan | null>(null)
  const [isRestoring, setIsRestoring] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)
  const loadedOnce = useRef(false)

  // Configura o SDK da loja com o nosso userId assim que a sessão existe.
  useEffect(() => {
    if (userId) {
      configurePurchases(userId)
    }
  }, [userId])

  const loadStatus = useCallback(async () => {
    const result = await fetchSubscriptionState()

    if (result.ok) {
      setState(result.data)
    } else {
      setError(result.error)
    }
  }, [])

  const loadOffers = useCallback(async () => {
    if (!isPurchasesConfigured()) {
      return
    }

    try {
      setOffers(await getPlanOffers())
    } catch {
      // Falha ao buscar preços não deve travar a tela; o status ainda carrega.
    }
  }, [])

  const load = useCallback(async () => {
    setIsLoading(true)
    setError(null)
    await Promise.all([loadStatus(), loadOffers()])
    loadedOnce.current = true
    setIsLoading(false)
  }, [loadStatus, loadOffers])

  useFocusEffect(
    useCallback(() => {
      void load()
    }, [load]),
  )

  // Compra: abre a loja e, se concluída, pede ao servidor para confirmar. As
  // vantagens só aparecem após o servidor validar com a loja.
  const buy = useCallback(
    async (plan: SubscriptionPlan) => {
      setError(null)
      setNotice(null)

      const offer = offers.find((item) => item.plan === plan)

      if (!offer) {
        setError("Plano indisponível no momento. Tente novamente.")
        return
      }

      setBusyPlan(plan)

      const purchase = await purchasePlan(offer.pkg)

      if (!purchase.ok) {
        if (!purchase.cancelled) {
          setError("Não foi possível concluir a compra na loja. Tente novamente.")
        }
        setBusyPlan(null)
        return
      }

      const synced = await syncSubscription()

      if (synced.ok) {
        setState(synced.data)
        setNotice("Assinatura ativa! Suas vantagens já estão liberadas.")
      } else {
        // A compra foi feita, mas a confirmação falhou. O webhook/reconciliação do
        // servidor deve liberar em instantes; orientamos a tentar restaurar.
        setError(
          "Compra recebida. A liberação pode levar alguns instantes — use 'Restaurar compra' se as vantagens não aparecerem.",
        )
      }

      setBusyPlan(null)
    },
    [offers],
  )

  const restore = useCallback(async () => {
    setError(null)
    setNotice(null)
    setIsRestoring(true)

    try {
      await restorePurchases()
    } catch {
      setError("Não foi possível restaurar na loja. Tente novamente.")
      setIsRestoring(false)
      return
    }

    const result = await restoreSubscription()

    if (result.ok) {
      setState(result.data)
      setNotice("Assinatura restaurada com sucesso.")
    } else if (result.status === 404) {
      setNotice("Nenhuma assinatura ativa para restaurar.")
    } else {
      setError(result.error)
    }

    setIsRestoring(false)
  }, [])

  return {
    state,
    offers,
    isLoading,
    busyPlan,
    isRestoring,
    error,
    notice,
    purchasesAvailable: isPurchasesConfigured(),
    buy,
    restore,
    refetch: load,
  }
}
