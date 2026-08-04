import { Ionicons } from "@expo/vector-icons"
import type { ReactNode } from "react"
import { Modal, Pressable, StyleSheet, Text, useWindowDimensions, View } from "react-native"

import { colors } from "@/features/client-home/theme"
import { useKeyboardHeight } from "@/lib/use-keyboard-height"

// Espaço mínimo de fundo visível acima do sheet, para o usuário perceber que há
// tela atrás e conseguir tocar fora para fechar.
const MIN_BACKDROP = 60

// Altura padrão do sheet quando o teclado está fechado.
const MAX_HEIGHT_RATIO = 0.75

type Props = {
  visible: boolean
  title: string
  onClose: () => void
  children: ReactNode
}

// Bottom sheet padrão para seleções com campo de texto (cidade, categoria,
// múltipla escolha). Encolhe acima do teclado para que o campo de busca e a
// lista de sugestões continuem visíveis e tocáveis.
//
// Dentro de um <Modal> o Android abre uma janela própria, que não herda o
// `softwareKeyboardLayoutMode: "resize"` da activity — por isso o ajuste aqui é
// explícito, via `useKeyboardHeight`, em vez de automático.
export function FormSheet({ visible, title, onClose, children }: Props) {
  const keyboardHeight = useKeyboardHeight()
  const { height: windowHeight } = useWindowDimensions()

  const maxHeight = Math.min(
    windowHeight * MAX_HEIGHT_RATIO,
    windowHeight - keyboardHeight - MIN_BACKDROP,
  )

  return (
    <Modal animationType="slide" onRequestClose={onClose} transparent visible={visible}>
      <Pressable onPress={onClose} style={styles.backdrop} />
      <View
        style={[
          styles.sheet,
          {
            marginBottom: keyboardHeight,
            maxHeight,
            paddingBottom: keyboardHeight > 0 ? 12 : 24,
          },
        ]}
      >
        <View style={styles.header}>
          <Text style={styles.title}>{title}</Text>
          <Pressable accessibilityRole="button" hitSlop={8} onPress={onClose}>
            <Ionicons color={colors.textSecondary} name="close" size={24} />
          </Pressable>
        </View>

        {children}
      </View>
    </Modal>
  )
}

const styles = StyleSheet.create({
  backdrop: {
    backgroundColor: "rgba(0,0,0,0.35)",
    flex: 1,
  },
  header: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingVertical: 14,
  },
  sheet: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingTop: 8,
  },
  title: {
    color: colors.textPrimary,
    fontSize: 18,
    fontWeight: "700",
  },
})
