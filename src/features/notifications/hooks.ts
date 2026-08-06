import { useFocusEffect } from "expo-router"
import { useCallback, useRef, useState } from "react"

import { useNotificationBadges } from "./badges-context"
import { fetchNotifications, markNotificationsRead } from "./service"
import type { AppNotification } from "./types"

// Central de notificações: carrega a lista ao focar e marca tudo como lido.
export function useNotificationCenter() {
  const [notifications, setNotifications] = useState<AppNotification[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const loadedOnce = useRef(false)
  const { refresh: refreshBadges } = useNotificationBadges()

  const load = useCallback(
    async (mode: "initial" | "refresh") => {
      if (mode === "refresh") {
        setIsRefreshing(true)
      } else {
        setIsLoading(true)
      }
      setError(null)

      const result = await fetchNotifications()

      if (result.ok) {
        setNotifications(result.data.notifications)

        // Ao abrir a central, marca como lidas (não bloqueia a renderização) e
        // recarrega os indicadores: a leitura aqui vale para todas as áreas, e
        // sem isso as abas continuariam acesas até o próximo evento.
        if (result.data.unreadCount > 0) {
          void markNotificationsRead().then(() => refreshBadges())
        }
      } else {
        setError(result.error)
      }

      loadedOnce.current = true
      setIsLoading(false)
      setIsRefreshing(false)
    },
    [refreshBadges],
  )

  useFocusEffect(
    useCallback(() => {
      void load(loadedOnce.current ? "refresh" : "initial")
    }, [load]),
  )

  const refetch = useCallback(() => load("refresh"), [load])

  return { notifications, isLoading, isRefreshing, error, refetch }
}

// Contagem de pendências para o indicador (sino) das telas iniciais. Vem das
// mesmas contagens da barra de abas, que já chegam por evento — o sino acende
// junto com o indicador da aba, sem nenhuma requisição própria.
export function useUnreadNotifications() {
  const { badges } = useNotificationBadges()

  const unreadCount = Object.values(badges).reduce((total, count) => total + count, 0)

  return { unreadCount }
}
