import { ActivityIndicator, StyleSheet, View } from "react-native"

import { colors } from "@/features/client-home/theme"

// Indicador de carregamento padrão do app. `fill` ocupa todo o espaço disponível
// (centralizado na tela); sem ele, fica um bloco centralizado dentro do conteúdo.
export function LoadingState({ fill = false }: { fill?: boolean }) {
  return (
    <View style={[styles.base, fill && styles.fill]}>
      <ActivityIndicator color={colors.primary} />
    </View>
  )
}

const styles = StyleSheet.create({
  base: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 48,
  },
  fill: {
    flex: 1,
    paddingVertical: 0,
  },
})
