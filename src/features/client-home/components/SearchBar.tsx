import { Ionicons } from "@expo/vector-icons"
import { StyleSheet, TextInput, View } from "react-native"

import { colors, radius } from "../theme"

type Props = {
  value: string
  onChangeText: (value: string) => void
  placeholder?: string
}

export function SearchBar({ value, onChangeText, placeholder = "Buscar serviços ou categorias" }: Props) {
  return (
    <View style={styles.container}>
      <Ionicons color={colors.textTertiary} name="search-outline" size={20} />
      <TextInput
        accessibilityLabel={placeholder}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={colors.textTertiary}
        returnKeyType="search"
        style={styles.input}
        value={value}
      />
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    alignItems: "center",
    backgroundColor: colors.surface,
    borderColor: colors.cardBorder,
    borderRadius: radius.search,
    borderWidth: 1,
    flexDirection: "row",
    gap: 10,
    paddingHorizontal: 14,
  },
  input: {
    color: colors.textPrimary,
    flex: 1,
    fontSize: 15,
    paddingVertical: 14,
  },
})
