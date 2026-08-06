import { useFocusEffect, useIsFocused } from "expo-router"
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react"

import { useToast } from "@/components/ui/Toast"
import { useRealtimeConnection, useRealtimeEvent } from "@/features/realtime/hooks"

import {
  ALERT_ICON,
  ALERT_TONE,
  EMPTY_BADGES,
  MESSAGE_ALERT_ICON,
  MESSAGE_ALERT_TONE,
  type BadgeArea,
  type Badges,
  type PendingAlert,
} from "./badges-types"
import { usePushReceived } from "./push"
import { fetchNotificationBadges, markNotificationsRead } from "./service"

type BadgesContextValue = {
  badges: Badges
  markAreaRead: (area: BadgeArea) => void
  refresh: () => void
  // Conversa aberta na tela. Mensagens dela não geram aviso: já aparecem na
  // própria conversa.
  setActiveChat: (chatId: string | null) => void
}

const BadgesContext = createContext<BadgesContextValue>({
  badges: EMPTY_BADGES,
  markAreaRead: () => {},
  refresh: () => {},
  setActiveChat: () => {},
})

export function useNotificationBadges(): BadgesContextValue {
  return useContext(BadgesContext)
}

// Revalida ao ganhar foco. Usado pela lista de conversas: ao voltar de um chat,
// as mensagens daquela conversa já foram marcadas como lidas no servidor e o
// indicador precisa cair na hora.
export function useRefreshBadgesOnFocus() {
  const { refresh } = useNotificationBadges()

  useFocusEffect(
    useCallback(() => {
      refresh()
    }, [refresh]),
  )
}

// Declara qual conversa está aberta, enquanto a tela do chat estiver montada.
export function useActiveChat(chatId: string) {
  const { setActiveChat } = useNotificationBadges()

  useEffect(() => {
    setActiveChat(chatId)

    return () => setActiveChat(null)
  }, [chatId, setActiveChat])
}

// Usado pela tela dona de uma aba: enquanto ela estiver em foco, o que já foi
// contado é considerado visualizado e o indicador some. "messages" é a exceção —
// lá a leitura é por conversa aberta, não por abrir a lista.
//
// Observar `badges[area]` com a tela em foco cobre o evento que chega enquanto o
// usuário já está parado na aba: ele é marcado ali mesmo, e o indicador não
// acende na tela em que a pessoa está olhando.
export function useMarkAreaRead(area: BadgeArea) {
  const { badges, markAreaRead } = useNotificationBadges()
  const isFocused = useIsFocused()

  useEffect(() => {
    if (isFocused && badges[area] > 0) {
      markAreaRead(area)
    }
  }, [area, badges, isFocused, markAreaRead])
}

// Mantém as contagens de pendência por aba atualizadas enquanto o app está em
// uso. Fica no layout privado, acima da barra de abas.
//
// A atualização é dirigida por evento: o servidor empurra `notification:new` e
// `message:new` pela conexão que o chat já usa, e o indicador acende na hora. A
// carga completa acontece uma vez por conexão estabelecida — o que cobre a
// abertura do app, a reconexão e a volta do segundo plano —, nunca por tempo.
export function NotificationBadgesProvider({ children }: { children: ReactNode }) {
  const [badges, setBadges] = useState<Badges>(EMPTY_BADGES)
  const showToast = useToast()

  const activeChatId = useRef<string | null>(null)

  const setActiveChat = useCallback((chatId: string | null) => {
    activeChatId.current = chatId
  }, [])

  // Eventos já avisados nesta sessão. O mesmo evento chega pelo socket e volta
  // em `events` na reconciliação seguinte enquanto seguir pendente; sem isto o
  // toast se repetiria. Vive só na memória: se o app for reaberto e o evento
  // ainda não tiver sido visualizado, o aviso deve mesmo aparecer de novo.
  const alertedIds = useRef(new Set<string>())

  // Exibir o aviso não marca nada como lido: o indicador da aba continua até o
  // usuário abrir a área. O toast é reforço, não substituto.
  const alert = useCallback(
    (events: PendingAlert[]) => {
      // Do mais antigo para o mais recente: a fila mostra na ordem em que
      // aconteceram, e o servidor devolve em ordem decrescente.
      for (const event of [...events].reverse()) {
        const tone = ALERT_TONE[event.type]

        if (!tone || alertedIds.current.has(event.id)) {
          continue
        }

        alertedIds.current.add(event.id)
        showToast({
          id: event.id,
          tone,
          icon: ALERT_ICON[event.type],
          title: event.title,
          message: event.message,
        })
      }
    },
    [showToast],
  )

  const refresh = useCallback(async () => {
    const result = await fetchNotificationBadges()

    // Falha de rede não zera nada nem alerta o usuário: mantemos as últimas
    // contagens conhecidas e tentamos de novo na próxima conexão.
    if (result.ok) {
      setBadges({ ...EMPTY_BADGES, ...result.data.badges })
      alert(result.data.events ?? [])
    }
  }, [alert])

  // Guardado em ref para que os assinantes não sejam recriados a cada render.
  const refreshRef = useRef(refresh)
  refreshRef.current = refresh

  // Reconciliação: uma carga por conexão estabelecida. Recupera o que aconteceu
  // enquanto o app esteve desconectado e cobre a primeira abertura.
  useRealtimeConnection(useCallback(() => void refreshRef.current(), []))

  // Notificação nova: o indicador acende na hora, sem consultar o servidor. A
  // `area` vem no próprio evento, resolvida pelo perfil de quem recebe.
  useRealtimeEvent(
    "notification:new",
    useCallback(
      (event) => {
        const { notification } = event

        setBadges((current) => ({
          ...current,
          [notification.area]: current[notification.area] + 1,
        }))

        alert([notification])
      },
      [alert],
    ),
  )

  // Mensagem nova: alimenta o indicador de "Mensagens" e avisa quem não está na
  // conversa. A contagem continua sendo a de mensagens não lidas — o servidor a
  // deriva de `Message.readAt`, e o incremento local acompanha essa mesma conta.
  useRealtimeEvent(
    "message:new",
    useCallback(
      (event) => {
        if (event.chatId === activeChatId.current) {
          // A conversa está aberta: a mensagem já apareceu nela e foi marcada
          // como lida. Nem indicador, nem aviso.
          return
        }

        setBadges((current) => ({ ...current, messages: current.messages + 1 }))

        if (alertedIds.current.has(event.message.id)) {
          return
        }

        alertedIds.current.add(event.message.id)
        showToast({
          id: event.message.id,
          tone: MESSAGE_ALERT_TONE,
          icon: MESSAGE_ALERT_ICON,
          title: event.senderName,
          message: event.message.content || "📷 Foto",
        })
      },
      [showToast],
    ),
  )

  // Push chegando com o app aberto: rede de segurança para o caso de a conexão
  // estar caída sem que o heartbeat tenha percebido ainda.
  usePushReceived(useCallback(() => void refreshRef.current(), []))

  // Atualização otimista: o indicador some assim que a tela é aberta, sem
  // esperar a resposta. Se o POST falhar, a próxima carga traz a verdade de
  // volta — um badge que reaparece incomoda menos que um alerta de erro.
  const markAreaRead = useCallback((area: BadgeArea) => {
    setBadges((current) => (current[area] === 0 ? current : { ...current, [area]: 0 }))
    void markNotificationsRead(area)
  }, [])

  const refreshNow = useCallback(() => void refreshRef.current(), [])

  return (
    <BadgesContext.Provider
      value={{ badges, markAreaRead, refresh: refreshNow, setActiveChat }}
    >
      {children}
    </BadgesContext.Provider>
  )
}
