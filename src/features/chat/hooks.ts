import { type Href, router, useFocusEffect } from "expo-router"
import { useCallback, useRef, useState } from "react"
import { Alert } from "react-native"

import { routes } from "@/constants/routes"

import { deleteMessage, fetchChats, fetchMessages, openChat, sendMessage } from "./service"
import type { ChatMessage, ChatOtherUser, ChatSummary, PendingPhoto } from "./types"

// Enquanto a lista/conversa está em foco, revalidamos em intervalo curto — é o
// "tempo real" via polling, simples e suficiente para o volume esperado. A
// conversa aberta atualiza mais rápido para novas mensagens chegarem quase na
// hora; o envio é otimista (aparece na tela na hora, sem esperar o servidor).
const CHAT_LIST_POLL_MS = 5_000
const CHAT_MESSAGES_POLL_MS = 2_000

// Envio resiliente ao cold start do servidor: se a primeira tentativa falha
// (timeout enquanto o servidor "acorda"), tenta de novo antes de marcar como falha.
const MAX_SEND_ATTEMPTS = 3
const SEND_RETRY_DELAY_MS = 1_500

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

// Junta as mensagens do servidor (fonte da verdade) com as locais ainda pendentes
// (enviando/falha), que ainda não existem no servidor. Sem isso, o polling
// "engoliria" a mensagem otimista recém-enviada. `deleting` são ids em exclusão
// otimista: ficam de fora até o servidor confirmar, evitando que um poll que
// chegue antes da confirmação faça a mensagem "piscar" de volta na tela.
function mergeMessages(
  server: ChatMessage[],
  previous: ChatMessage[],
  deleting: Set<string>,
): ChatMessage[] {
  const serverIds = new Set(server.map((message) => message.id))
  const pending = previous.filter(
    (message) =>
      (message.status === "sending" || message.status === "failed") && !serverIds.has(message.id),
  )
  return [...server, ...pending].filter((message) => !deleting.has(message.id))
}

// Id temporário de uma mensagem otimista (antes do servidor confirmar).
function localId(): string {
  return `local-${Date.now()}-${Math.random().toString(36).slice(2)}`
}

// Uma conversa: histórico, cabeçalho (outra pessoa) e envio. Faz polling enquanto
// aberta, então mensagens novas e recibos de leitura chegam sozinhos. O envio é
// otimista: a mensagem aparece na hora e depois é confirmada (ou marcada como
// falha, com opção de reenviar).
export function useChat(chatId: string) {
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [otherUser, setOtherUser] = useState<ChatOtherUser | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const loadedOnce = useRef(false)
  // Ids em exclusão otimista, escondidos dos merges até o servidor confirmar.
  const deletingIds = useRef<Set<string>>(new Set())

  const load = useCallback(
    async (mode: "initial" | "silent") => {
      if (mode === "initial") {
        setIsLoading(true)
      }

      const result = await fetchMessages(chatId)

      if (result.ok) {
        setMessages((previous) => mergeMessages(result.data.messages, previous, deletingIds.current))
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

  // Faz a chamada ao servidor para uma mensagem já visível (otimista). Tenta
  // algumas vezes antes de desistir: cobre o cold start do servidor (a primeira
  // requisição após ociosidade pode estourar o timeout enquanto ele "acorda"), de
  // modo que a mensagem se recupera sozinha sem o usuário precisar reenviar. Ao
  // confirmar, troca a temporária pela definitiva (id real); só marca "failed"
  // depois de esgotar as tentativas, mantendo o texto na conversa.
  const deliver = useCallback(
    async (id: string, content: string, photo?: PendingPhoto) => {
      for (let attempt = 1; attempt <= MAX_SEND_ATTEMPTS; attempt += 1) {
        const result = await sendMessage(chatId, content, photo)

        if (result.ok) {
          setMessages((previous) =>
            previous.map((message) =>
              message.id === id ? { ...result.data, status: "sent" as const } : message,
            ),
          )
          return
        }

        // 403 = conversa bloqueada: reenviar não vai adiantar, falha na hora.
        if (result.status === 403) {
          break
        }

        if (attempt < MAX_SEND_ATTEMPTS) {
          await new Promise((resolve) => setTimeout(resolve, SEND_RETRY_DELAY_MS))
        }
      }

      setMessages((previous) =>
        previous.map((message) =>
          message.id === id ? { ...message, status: "failed" as const } : message,
        ),
      )
    },
    [chatId],
  )

  // Toca em enviar: a mensagem aparece imediatamente com status "sending". A foto
  // (quando há) já subiu para a Cloudinary antes daqui; enquanto o servidor não
  // confirma, o balão mostra o arquivo local — a URL definitiva chega na resposta.
  const send = useCallback(
    (content: string, attachment?: { photo: PendingPhoto; localUri: string }) => {
      const id = localId()
      const optimistic: ChatMessage = {
        id,
        content,
        attachmentUrl: attachment?.localUri ?? null,
        mine: true,
        read: false,
        createdAt: new Date().toISOString(),
        status: "sending",
        pendingPhoto: attachment?.photo,
      }
      setMessages((previous) => [...previous, optimistic])
      void deliver(id, content, attachment?.photo)
    },
    [deliver],
  )

  // Reenvia uma mensagem que falhou, sem o usuário reescrever o texto. A foto é
  // reaproveitada de `pendingPhoto`: já está na Cloudinary, subir de novo só
  // criaria um arquivo órfão.
  const retry = useCallback(
    (message: ChatMessage) => {
      setMessages((previous) =>
        previous.map((item) =>
          item.id === message.id ? { ...item, status: "sending" as const } : item,
        ),
      )
      void deliver(message.id, message.content, message.pendingPhoto)
    },
    [deliver],
  )

  // Exclui uma mensagem enviada (só antes de lida). Remove da tela na hora e, em
  // falha (ex.: 409 — foi lida nesse meio-tempo), ressincroniza com o servidor
  // para a mensagem reaparecer e devolve o erro para a tela avisar o usuário.
  const remove = useCallback(
    async (message: ChatMessage): Promise<{ ok: boolean; error?: string }> => {
      deletingIds.current.add(message.id)
      setMessages((previous) => previous.filter((item) => item.id !== message.id))

      const result = await deleteMessage(chatId, message.id)

      deletingIds.current.delete(message.id)

      if (!result.ok) {
        await load("silent")
        return { ok: false, error: result.error }
      }

      return { ok: true }
    },
    [chatId, load],
  )

  return { messages, otherUser, isLoading, error, send, retry, remove }
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
