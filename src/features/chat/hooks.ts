import { type Href, router, useFocusEffect } from "expo-router"
import { useCallback, useRef, useState } from "react"
import { Alert } from "react-native"

import { routes } from "@/constants/routes"

import { fetchChats, fetchMessages, openChat, sendMessage } from "./service"
import type { ChatMessage, ChatOtherUser, ChatSummary } from "./types"

// Enquanto a lista/conversa está em foco, revalidamos em intervalo curto — é o
// "tempo real" via polling, simples e suficiente para o volume esperado.
const CHAT_LIST_POLL_MS = 10_000
const CHAT_MESSAGES_POLL_MS = 4_000

// Lista de conversas. Recarrega ao focar e faz polling silencioso para atualizar
// prévias e não-lidas sem piscar a tela.
export function useChats() {
  const [chats, setChats] = useState<ChatSummary[]>([])
  const [totalUnread, setTotalUnread] = useState(0)
  const [isLoading, setIsLoading] = useState(true)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const loadedOnce = useRef(false)

  const load = useCallback(async (mode: "initial" | "refresh" | "silent") => {
    if (mode === "refresh") {
      setIsRefreshing(true)
    } else if (mode === "initial") {
      setIsLoading(true)
    }

    const result = await fetchChats()

    if (result.ok) {
      setChats(result.data.chats)
      setTotalUnread(result.data.totalUnread)
      setError(null)
    } else if (mode !== "silent") {
      setError(result.error)
    }

    loadedOnce.current = true
    setIsLoading(false)
    setIsRefreshing(false)
  }, [])

  useFocusEffect(
    useCallback(() => {
      void load(loadedOnce.current ? "refresh" : "initial")
      const interval = setInterval(() => void load("silent"), CHAT_LIST_POLL_MS)
      return () => clearInterval(interval)
    }, [load]),
  )

  const refetch = useCallback(() => load("refresh"), [load])

  return { chats, totalUnread, isLoading, isRefreshing, error, refetch }
}

// Uma conversa: histórico, cabeçalho (outra pessoa) e envio. Faz polling enquanto
// aberta, então mensagens novas e recibos de leitura chegam sozinhos.
export function useChat(chatId: string) {
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [otherUser, setOtherUser] = useState<ChatOtherUser | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [isSending, setIsSending] = useState(false)
  const loadedOnce = useRef(false)

  const load = useCallback(
    async (mode: "initial" | "silent") => {
      if (mode === "initial") {
        setIsLoading(true)
      }

      const result = await fetchMessages(chatId)

      if (result.ok) {
        setMessages(result.data.messages)
        setOtherUser(result.data.otherUser)
        setError(null)
      } else if (mode === "initial") {
        setError(result.error)
      }

      loadedOnce.current = true
      setIsLoading(false)
    },
    [chatId],
  )

  useFocusEffect(
    useCallback(() => {
      void load(loadedOnce.current ? "silent" : "initial")
      const interval = setInterval(() => void load("silent"), CHAT_MESSAGES_POLL_MS)
      return () => clearInterval(interval)
    }, [load]),
  )

  const send = useCallback(
    async (content: string): Promise<boolean> => {
      setIsSending(true)
      const result = await sendMessage(chatId, content)
      setIsSending(false)

      if (result.ok) {
        // Acrescenta na hora; o próximo polling reconcilia com o servidor.
        setMessages((current) => [...current, result.data])
        return true
      }

      Alert.alert("Não foi possível enviar", result.error)
      return false
    },
    [chatId],
  )

  return { messages, otherUser, isLoading, error, isSending, send }
}

// Abre a conversa com um usuário e navega para ela. Usado pelos botões
// "Conversar" nos perfis. Reutiliza a conversa existente do par, se houver.
export function useStartChat() {
  const [isStarting, setIsStarting] = useState(false)

  const start = useCallback(async (targetUserId: string) => {
    setIsStarting(true)
    const result = await openChat(targetUserId)
    setIsStarting(false)

    if (result.ok) {
      router.push(`${routes.chat}?id=${result.data.id}` as Href)
    } else {
      Alert.alert("Não foi possível abrir a conversa", result.error)
    }
  }, [])

  return { start, isStarting }
}
