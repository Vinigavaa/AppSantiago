import { useEffect, useRef } from "react"

import { subscribe } from "./client"
import type { RealtimeEvent, RealtimeEventType } from "./types"

// Os handlers ficam em `ref` para que a assinatura não seja refeita a cada
// render: o efeito roda uma vez por montagem, e o cancelamento no cleanup
// garante que uma remontagem não deixe ouvinte para trás.

// Assina um tipo de evento. O handler recebe o evento já estreitado pelo tipo.
export function useRealtimeEvent<T extends RealtimeEventType>(
  type: T,
  handler: (event: Extract<RealtimeEvent, { type: T }>) => void,
) {
  const handlerRef = useRef(handler)
  handlerRef.current = handler

  useEffect(() => {
    return subscribe({
      onEvent: (event) => {
        if (event.type === type) {
          handlerRef.current(event as Extract<RealtimeEvent, { type: T }>)
        }
      },
    })
  }, [type])
}

// Executa a reconciliação da tela a cada conexão estabelecida (inclusive
// reconexões), recuperando o que aconteceu enquanto o app esteve desconectado.
export function useRealtimeConnection(onConnected: () => void) {
  const handlerRef = useRef(onConnected)
  handlerRef.current = onConnected

  useEffect(() => {
    return subscribe({ onConnected: () => handlerRef.current() })
  }, [])
}
