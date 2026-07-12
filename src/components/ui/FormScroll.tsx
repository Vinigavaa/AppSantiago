import { forwardRef } from "react"
import { ScrollView, type ScrollViewProps } from "react-native"

// Área rolável padrão para formulários. Mantém o campo em edição visível acima do
// teclado: no iOS via `automaticallyAdjustKeyboardInsets` (ajusta o inset e rola
// até o campo focado); no Android via `softwareKeyboardLayoutMode: "resize"`
// (app.json), que encolhe a janela e rola o campo focado para a área visível.
// Tocar fora de um campo ou arrastar a lista fecha o teclado.
export const FormScroll = forwardRef<ScrollView, ScrollViewProps>(function FormScroll(props, ref) {
  return (
    <ScrollView
      ref={ref}
      automaticallyAdjustKeyboardInsets
      keyboardDismissMode="on-drag"
      keyboardShouldPersistTaps="handled"
      showsVerticalScrollIndicator={false}
      {...props}
    />
  )
})
