import { StyleSheet, Text, TextInput, type TextInputProps, View } from "react-native"

import { colors, radius, typography } from "@/features/client-home/theme"

type Props = TextInputProps & {
  label: string
  error?: string
}

// Campo de texto único do app: mesma borda, raio, altura e tipografia. A borda
// muda para vermelho quando há erro, com a mensagem logo abaixo.
export function Input({ label, error, style, ...props }: Props) {
  return (
    <View style={styles.container}>
      <Text style={styles.label}>{label}</Text>
      <TextInput
        autoCapitalize="none"
        placeholderTextColor={colors.textTertiary}
        style={[styles.input, error && styles.inputError, style]}
        {...props}
      />
      {error ? <Text style={styles.error}>{error}</Text> : null}
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    gap: 6,
  },
  error: {
    ...typography.caption,
    color: colors.danger,
  },
  input: {
    ...typography.body,
    backgroundColor: colors.surface,
    borderColor: colors.chipInactiveBorder,
    borderRadius: radius.control,
    borderWidth: 1,
    color: colors.textPrimary,
    minHeight: 50,
    paddingHorizontal: 14,
  },
  inputError: {
    borderColor: colors.danger,
  },
  label: {
    ...typography.label,
    color: colors.textPrimary,
  },
})
