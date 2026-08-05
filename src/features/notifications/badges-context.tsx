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
import { AppState, type AppStateStatus } from "react-native"

import { useToast } from "@/components/ui/Toast"

import {
  ALERT_TONE,
  EMPTY_BADGES,
  type BadgeArea,
  type Badges,
  type PendingAlert,
} from "./badges-types"
import { usePushReceived } from "./push"
import { fetchNotificationBadges, markNotificationsRead } from "./service"

// Intervalo do poll. Este é o tempo máximo até uma novidade aparecer, então ele
// precisa ser menor que a paciência de quem está usando o app: cliente e
// profissional costumam interagir em segundos (aceitar proposta, responder no
// chat). Com 45s, a novidade acontecia e era lida antes do primeiro ciclo — na
// prática o indicador nunca aparecia.
//
// O push não serve de rede de segurança aqui: não funciona em emulador nem no
// Expo Go, e depende de permissão concedida. Ele só antecipa o que o poll já faz.
const POLL_INTERVAL_MS = 15_000

type BadgesContextValue = {
  badges: Badges
  markAreaRead: (area: BadgeArea) => void
  refresh: () => void
}

const BadgesContext = createContext<BadgesContextValue>({
  badges: EMPTY_BADGES,
  markAreaRead: () => {},
  refresh: () => {},
})

export function useNotificationBadges(): BadgesContextValue {
  return useContext(BadgesContext)
}

// Revalida ao ganhar foco. Usado pela lista de conversas: ao voltar de um chat,
// as mensagens daquela conversa já foram marcadas como lidas no servidor e o
// indicador precisa cair na hora, sem esperar o próximo ciclo do poll.
export function useRefreshBadgesOnFocus() {
  const { refresh } = useNotificationBadges()

  useFocusEffect(
    useCallback(() => {
      refresh()
    }, [refresh]),
  )
}

// Usado pela tela dona de uma aba: enquanto ela estiver em foco, o que já foi
// contado é considerado visualizado e o indicador some. "messages" é a exceção —
// lá a leitura é por conversa aberta, não por abrir a lista.
//
// A condição `> 0` é essencial: marcar a área ao simples foco fazia o app
// destruir notificações que ele nem sabia que existiam. Bastava o usuário abrir
// a aba nos segundos entre o evento acontecer e o poll perceber, e a novidade
// era marcada como lida sem nunca ter virado badge nem aviso.
//
// Observar `badges[area]` com a tela em foco cobre o caso oposto: se a novidade
// chegar enquanto o usuário já está na tela, ela é marcada ali mesmo — o
// indicador não fica aceso na aba em que ele está parado.
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
// uso, sem exigir que o usuário troque de tela. Fica no layout privado, acima
// da barra de abas.
export function NotificationBadgesProvider({ children }: { children: ReactNode }) {
  const [badges, setBadges] = useState<Badges>(EMPTY_BADGES)
  const showToast = useToast()

  // Eventos já avisados nesta sessão. Impede o toast repetido enquanto o evento
  // segue pendente (poll e push trazem o mesmo id várias vezes). Vive só na
  // memória: se o app for reaberto e o evento ainda não tiver sido visualizado,
  // o aviso deve mesmo aparecer de novo.
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
        showToast({ id: event.id, tone, title: event.title, message: event.message })
      }
    },
    [showToast],
  )

  const refresh = useCallback(async () => {
    const result = await fetchNotificationBadges()

    // Falha de rede não zera nada nem alerta o usuário: mantemos as últimas
    // contagens conhecidas e tentamos de novo no próximo ciclo.
    if (result.ok) {
      setBadges({ ...EMPTY_BADGES, ...result.data.badges })
      alert(result.data.events ?? [])
    }
  }, [alert])

  // Guardado em ref para que o intervalo e os listeners não sejam recriados.
  const refreshRef = useRef(refresh)
  refreshRef.current = refresh

  useEffect(() => {
    let intervalId: ReturnType<typeof setInterval> | null = null

    const startPolling = () => {
      if (intervalId === null) {
        intervalId = setInterval(() => void refreshRef.current(), POLL_INTERVAL_MS)
      }
    }

    const stopPolling = () => {
      if (intervalId !== null) {
        clearInterval(intervalId)
        intervalId = null
      }
    }

    void refreshRef.current()
    startPolling()

    // Em segundo plano o poll é desligado; ao voltar, revalida na hora — o
    // usuário não deve encontrar um indicador desatualizado ao reabrir o app.
    const subscription = AppState.addEventListener("change", (state: AppStateStatus) => {
      if (state === "active") {
        void refreshRef.current()
        startPolling()
      } else {
        stopPolling()
      }
    })

    return () => {
      stopPolling()
      subscription.remove()
    }
  }, [])

  // Push chegando com o app aberto: revalida imediatamente.
  usePushReceived(useCallback(() => void refreshRef.current(), []))


  // Atualização otimista: o indicador some assim que a tela é aberta, sem
  // esperar a resposta. Se o POST falhar, a próxima revalidação traz a verdade
  // de volta — um badge que reaparece incomoda menos que um alerta de erro.
  const markAreaRead = useCallback((area: BadgeArea) => {
    setBadges((current) => (current[area] === 0 ? current : { ...current, [area]: 0 }))
    void markNotificationsRead(area)
  }, [])

  const refreshNow = useCallback(() => void refreshRef.current(), [])

  return (
    <BadgesContext.Provider value={{ badges, markAreaRead, refresh: refreshNow }}>
      {children}
    </BadgesContext.Provider>
  )
}
