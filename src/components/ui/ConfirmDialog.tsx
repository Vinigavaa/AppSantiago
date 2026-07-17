import { createContext, useCallback, useContext, useState } from "react"
import { Modal, Pressable, StyleSheet, Text, View } from "react-native"

import { colors, radius, shadow, spacing, typography } from "@/features/client-home/theme"

// Diálogo de confirmação com a identidade do app, no lugar do Alert.alert nativo
// (cujos botões seguem o tema do sistema, fora da marca). A API é imperativa para
// manter as chamadas simples nos handlers: `if (await confirm({...})) { ... }`.

export type ConfirmOptions = {
  title: string
  message?: string
  // Rótulos dos botões. Defaults: "Confirmar" e "Cancelar".
  confirmLabel?: string
  cancelLabel?: string
  // Ação destrutiva (excluir, remover): pinta o botão de confirmação em vermelho.
  destructive?: boolean
}

type ConfirmFn = (options: ConfirmOptions) => Promise<boolean>

const ConfirmContext = createContext<ConfirmFn | null>(null)

type DialogState = (ConfirmOptions & { resolve: (confirmed: boolean) => void }) | null

export function ConfirmProvider({ children }: { children: React.ReactNode }) {
  const [dialog, setDialog] = useState<DialogState>(null)

  const confirm = useCallback<ConfirmFn>((options) => {
    return new Promise<boolean>((resolve) => {
      setDialog({ ...options, resolve })
    })
  }, [])

  // Resolve a promessa pendente e fecha. Fechar pelo backdrop/voltar = cancelar.
  function settle(confirmed: boolean) {
    dialog?.resolve(confirmed)
    setDialog(null)
  }

  return (
    <ConfirmContext.Provider value={confirm}>
      {children}
      <Modal
        animationType="fade"
        onRequestClose={() => settle(false)}
        transparent
        visible={dialog !== null}
      >
        <Pressable onPress={() => settle(false)} style={styles.backdrop}>
          {/* Toque no cartão não fecha: só backdrop/botões decidem. */}
          <Pressable onPress={() => {}} style={styles.card}>
            <Text style={styles.title}>{dialog?.title}</Text>
            {dialog?.message ? <Text style={styles.message}>{dialog.message}</Text> : null}

            <View style={styles.actions}>
              <Pressable
                accessibilityRole="button"
                onPress={() => settle(false)}
                style={({ pressed }) => [styles.button, pressed && styles.pressed]}
              >
                <Text style={styles.cancelLabel}>{dialog?.cancelLabel ?? "Cancelar"}</Text>
              </Pressable>
              <Pressable
                accessibilityRole="button"
                onPress={() => settle(true)}
                style={({ pressed }) => [
                  styles.button,
                  styles.confirmButton,
                  dialog?.destructive && styles.confirmDestructive,
                  pressed && styles.pressed,
                ]}
              >
                <Text style={styles.confirmLabel}>{dialog?.confirmLabel ?? "Confirmar"}</Text>
              </Pressable>
            </View>
          </Pressable>
        </Pressable>
      </Modal>
    </ConfirmContext.Provider>
  )
}

// Hook para disparar uma confirmação de dentro de qualquer handler.
export function useConfirm(): ConfirmFn {
  const confirm = useContext(ConfirmContext)
  if (!confirm) {
    throw new Error("useConfirm precisa estar dentro de <ConfirmProvider>.")
  }
  return confirm
}

const styles = StyleSheet.create({
  actions: {
    flexDirection: "row",
    gap: spacing.sm,
    justifyContent: "flex-end",
    marginTop: spacing.md,
  },
  backdrop: {
    alignItems: "center",
    backgroundColor: colors.overlay,
    flex: 1,
    justifyContent: "center",
    padding: spacing.xl,
  },
  button: {
    alignItems: "center",
    borderRadius: radius.control,
    justifyContent: "center",
    minHeight: 44,
    paddingHorizontal: spacing.lg,
  },
  cancelLabel: {
    ...typography.label,
    color: colors.textSecondary,
    fontSize: 15,
  },
  card: {
    ...shadow.modal,
    backgroundColor: colors.surface,
    borderRadius: radius.card,
    maxWidth: 420,
    padding: spacing.xl,
    width: "100%",
  },
  confirmButton: {
    backgroundColor: colors.primary,
  },
  confirmDestructive: {
    backgroundColor: colors.danger,
  },
  confirmLabel: {
    ...typography.label,
    color: colors.onPrimary,
    fontSize: 15,
  },
  message: {
    ...typography.body,
    color: colors.textSecondary,
    marginTop: spacing.sm,
  },
  pressed: {
    opacity: 0.85,
  },
  title: {
    ...typography.title,
    color: colors.textPrimary,
  },
})
