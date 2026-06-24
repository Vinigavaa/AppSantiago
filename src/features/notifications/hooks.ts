import { useFocusEffect } from "expo-router"
import { useCallback, useRef, useState } from "react"

import { fetchNotifications, markNotificationsRead } from "./service"
import type { AppNotification } from "./types"

// Central de notificações: carrega a lista ao focar e marca tudo como lido.
export function useNotificationCenter() {
  const [notifications, setNotifications] = useState<AppNotification[]>([])
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

    const result = await fetchNotifications()

    if (result.ok) {
      setNotifications(result.data.notifications)
      // Ao abrir a central, marca como lidas (não bloqueia a renderização).
      if (result.data.unreadCount > 0) {
        void markNotificationsRead()
      }
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

  return { notifications, isLoading, isRefreshing, error, refetch }
}

// Apenas a contagem de não lidas, para o indicador (sino) das telas iniciais.
export function useUnreadNotifications() {
  const [unreadCount, setUnreadCount] = useState(0)

  const load = useCallback(async () => {
    const result = await fetchNotifications()
    if (result.ok) {
      setUnreadCount(result.data.unreadCount)
    }
  }, [])

  useFocusEffect(
    useCallback(() => {
      void load()
    }, [load]),
  )

  return { unreadCount }
}
