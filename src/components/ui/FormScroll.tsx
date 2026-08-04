import { forwardRef } from "react"
import { Platform, ScrollView, type ScrollViewProps } from "react-native"

import { useKeyboardHeight } from "@/lib/use-keyboard-height"

type Props = ScrollViewProps & {
  // Marque quando o formulário estiver dentro de um <Modal>. No Android o modal
  // abre em uma janela própria, que não herda o `softwareKeyboardLayoutMode:
  // "resize"` da activity — sem isso o conteúdo não encolhe e o campo focado
  // fica atrás do teclado.
  inModal?: boolean
}

// Área rolável padrão para formulários. Mantém o campo em edição visível acima do
// teclado: no iOS via `automaticallyAdjustKeyboardInsets` (ajusta o inset e rola
// até o campo focado); no Android via `softwareKeyboardLayoutMode: "resize"`
// (app.json), que encolhe a janela e rola o campo focado para a área visível.
// Tocar fora de um campo ou arrastar a lista fecha o teclado.
//
// Padrão do projeto para teclado:
// - Telas de formulário → `FormScroll`
// - Formulários dentro de <Modal> → `FormScroll inModal`
// - Bottom sheets de seleção com busca → `FormSheet`
// - Casos sem rolagem (barra fixa do chat) → `useKeyboardHeight`
// Não usar `KeyboardAvoidingView`: no Android ele soma padding ao `resize` da
// janela e gera espaço em excesso.
export const FormScroll = forwardRef<ScrollView, Props>(function FormScroll(
  { inModal = false, contentContainerStyle, ...props },
  ref,
) {
  const keyboardHeight = useKeyboardHeight()
  const needsManualInset = inModal && Platform.OS === "android"

  return (
    <ScrollView
      ref={ref}
      automaticallyAdjustKeyboardInsets
      contentContainerStyle={[
        contentContainerStyle,
        // Só sobrescreve o padding do conteúdo enquanto o teclado está aberto:
        // com 0 apagaria o espaçamento inferior definido por cada tela.
        needsManualInset && keyboardHeight > 0 ? { paddingBottom: keyboardHeight } : null,
      ]}
      keyboardDismissMode="on-drag"
      keyboardShouldPersistTaps="handled"
      showsVerticalScrollIndicator={false}
      {...props}
    />
  )
})
