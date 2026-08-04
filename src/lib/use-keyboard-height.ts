import { useEffect, useState } from "react"
import { Keyboard, Platform } from "react-native"

// Altura atual do teclado virtual (0 quando fechado).
//
// Usado por conteúdo que o ajuste automático da plataforma não alcança: dentro
// de um <Modal> o Android abre uma janela própria, que não herda o
// `softwareKeyboardLayoutMode: "resize"` da activity. Nesses casos aplicamos a
// altura explicitamente (padding / maxHeight).
//
// Em telas normais isso não é necessário: use `FormScroll`.
export function useKeyboardHeight(): number {
  const [height, setHeight] = useState(0)

  useEffect(() => {
    // iOS emite `will*` antes da animação (transição suave); o Android só emite
    // `did*`, depois que o teclado já apareceu.
    const showEvent = Platform.OS === "ios" ? "keyboardWillShow" : "keyboardDidShow"
    const hideEvent = Platform.OS === "ios" ? "keyboardWillHide" : "keyboardDidHide"

    // Lemos a altura de cada evento em vez de guardar a primeira: teclados de
    // terceiros mudam de altura ao abrir barra de sugestões ou emoji.
    const showSub = Keyboard.addListener(showEvent, (event) => {
      setHeight(event.endCoordinates.height)
    })
    const hideSub = Keyboard.addListener(hideEvent, () => {
      setHeight(0)
    })

    return () => {
      showSub.remove()
      hideSub.remove()
    }
  }, [])

  return height
}
