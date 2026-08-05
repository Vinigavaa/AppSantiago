import { Ionicons } from "@expo/vector-icons"
import { createContext, useCallback, useContext, useEffect, useState } from "react"
import { Pressable, StyleSheet, Text, View } from "react-native"
import { useSafeAreaInsets } from "react-native-safe-area-context"

import { colors, radius, shadow, spacing, status, typography } from "@/features/client-home/theme"

// Aviso flutuante no topo da tela. Reforça mudanças importantes sem interromper
// o uso do app: não bloqueia toques, sai sozinho e nunca empilha — vários avisos
// entram em fila e aparecem um de cada vez.

export type ToastTone = "success" | "danger" | "info"

export type ToastOptions = {
  // Identifica o evento de origem. Serve para o chamador evitar repetir o mesmo
  // aviso; aqui é usado apenas como chave de renderização.
  id: string
  tone: ToastTone
  title: string
  message?: string
}

type ShowToastFn = (options: ToastOptions) => void

const ToastContext = createContext<ShowToastFn>(() => {})

export function useToast(): ShowToastFn {
  return useContext(ToastContext)
}

// Tempo em tela antes de sair sozinho.
const VISIBLE_MS = 4000

const TONE_ICON: Record<ToastTone, keyof typeof Ionicons.glyphMap> = {
  success: "checkmark-circle",
  danger: "alert-circle",
  info: "information-circle",
}

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [queue, setQueue] = useState<ToastOptions[]>([])
  const insets = useSafeAreaInsets()

  const showToast = useCallback<ShowToastFn>((options) => {
    setQueue((current) => [...current, options])
  }, [])

  const current = queue[0]

  // O timer é reiniciado a cada aviso (a dependência é o id do que está em
  // tela). Dispensar antes da hora apenas adianta o próximo da fila.
  useEffect(() => {
    if (!current) {
      return
    }

    const timeoutId = setTimeout(() => {
      setQueue((rest) => rest.slice(1))
    }, VISIBLE_MS)

    return () => clearTimeout(timeoutId)
  }, [current])

  const dismiss = useCallback(() => setQueue((rest) => rest.slice(1)), [])

  return (
    <ToastContext.Provider value={showToast}>
      {children}

      {current ? (
        // box-none no contêiner: só o cartão recebe toques, o resto da área
        // continua entregando os eventos para a tela que está por baixo.
        <View pointerEvents="box-none" style={[styles.container, { top: insets.top + spacing.sm }]}>
          <Pressable
            accessibilityRole="button"
            onPress={dismiss}
            style={({ pressed }) => [
              styles.card,
              { borderLeftColor: status[current.tone].color },
              pressed && styles.pressed,
            ]}
          >
            <Ionicons
              color={status[current.tone].color}
              name={TONE_ICON[current.tone]}
              size={20}
            />
            <View style={styles.texts}>
              <Text style={styles.title}>{current.title}</Text>
              {current.message ? <Text style={styles.message}>{current.message}</Text> : null}
            </View>
          </Pressable>
        </View>
      ) : null}
    </ToastContext.Provider>
  )
}

const styles = StyleSheet.create({
  card: {
    alignItems: "flex-start",
    backgroundColor: colors.surface,
    borderLeftWidth: 3,
    borderRadius: radius.card,
    flexDirection: "row",
    gap: spacing.md,
    padding: spacing.lg,
    ...shadow.modal,
  },
  container: {
    // No Android as telas do navegador são views nativas (react-native-screens)
    // e sobem acima de irmãos sem elevação — sem isto o aviso é renderizado,
    // mas fica escondido atrás da tela.
    elevation: 24,
    left: spacing.lg,
    position: "absolute",
    right: spacing.lg,
    zIndex: 100,
  },
  message: {
    ...typography.caption,
    color: colors.textSecondary,
  },
  pressed: {
    opacity: 0.9,
  },
  texts: {
    flex: 1,
    gap: 2,
  },
  title: {
    ...typography.subtitle,
    color: colors.textPrimary,
  },
})
