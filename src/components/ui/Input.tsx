import { StyleSheet, Text, TextInput, type TextInputProps, View } from "react-native"

type Props = TextInputProps & {
  label: string
  error?: string
}

export function Input({ label, error, style, ...props }: Props) {
  return (
    <View style={styles.container}>
      <Text style={styles.label}>{label}</Text>
      <TextInput
        autoCapitalize="none"
        placeholderTextColor="#6B7280"
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
    color: "#B91C1C",
    fontSize: 13,
  },
  input: {
    backgroundColor: "#FFFFFF",
    borderColor: "#CBD5E1",
    borderRadius: 8,
    borderWidth: 1,
    color: "#111827",
    minHeight: 48,
    paddingHorizontal: 14,
  },
  inputError: {
    borderColor: "#B91C1C",
  },
  label: {
    color: "#111827",
    fontSize: 14,
    fontWeight: "600",
  },
})
