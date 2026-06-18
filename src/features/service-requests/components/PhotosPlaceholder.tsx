import { Ionicons } from "@expo/vector-icons"
import { StyleSheet, Text, View } from "react-native"

import { colors, radius } from "@/features/client-home/theme"

// Espaço reservado para o upload de fotos. O upload real depende de um storage
// dedicado e será habilitado em uma etapa seguinte (ver decisão de produto).
export function PhotosPlaceholder() {
  return (
    <View style={styles.container}>
      <Text style={styles.label}>Fotos do serviço</Text>
      <View style={styles.box}>
        <Ionicons color={colors.textTertiary} name="images-outline" size={26} />
        <Text style={styles.text}>Em breve você poderá anexar fotos do serviço.</Text>
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  box: {
    alignItems: "center",
    backgroundColor: colors.surface,
    borderColor: colors.chipInactiveBorder,
    borderRadius: radius.card,
    borderStyle: "dashed",
    borderWidth: 1,
    gap: 8,
    paddingHorizontal: 16,
    paddingVertical: 24,
  },
  container: {
    gap: 8,
  },
  label: {
    color: colors.textPrimary,
    fontSize: 14,
    fontWeight: "600",
  },
  text: {
    color: colors.textSecondary,
    fontSize: 13,
    textAlign: "center",
  },
})
