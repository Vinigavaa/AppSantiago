import { Ionicons } from "@expo/vector-icons"
import { ActivityIndicator, Pressable, type PressableProps, StyleSheet, Text } from "react-native"

import { colors, radius, typography } from "@/features/client-home/theme"

type Variant = "primary" | "secondary" | "ghost" | "danger"

type Props = PressableProps & {
  label: string
  variant?: Variant
  loading?: boolean
  icon?: keyof typeof Ionicons.glyphMap
}

// Cor do conteúdo (texto/ícone/spinner) por variante.
const CONTENT_COLOR: Record<Variant, string> = {
  primary: colors.onPrimary,
  secondary: colors.primarySoftText,
  ghost: colors.primary,
  danger: colors.onPrimary,
}

// Botão único do app: mesmo formato, feedback ao pressionar e estados de
// carregamento/desabilitado em todas as ações. Variantes diferenciam a ênfase —
// `primary` só para a ação principal de cada tela.
export function Button({
  label,
  variant = "primary",
  loading = false,
  icon,
  disabled,
  style,
  ...props
}: Props) {
  const isDisabled = disabled || loading
  const contentColor = CONTENT_COLOR[variant]

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled: !!isDisabled, busy: loading }}
      disabled={isDisabled}
      style={(state) => {
        const { pressed } = state

        return [
          styles.button,
          styles[variant],
          isDisabled && styles.disabled,
          pressed && !isDisabled && styles.pressed,
          typeof style === "function" ? style(state) : style,
        ]
      }}
      {...props}
    >
      {loading ? (
        <ActivityIndicator color={contentColor} size="small" />
      ) : (
        <>
          {icon ? <Ionicons color={contentColor} name={icon} size={18} /> : null}
          <Text style={[styles.label, { color: contentColor }]}>{label}</Text>
        </>
      )}
    </Pressable>
  )
}

const styles = StyleSheet.create({
  button: {
    alignItems: "center",
    borderRadius: radius.control,
    flexDirection: "row",
    gap: 8,
    justifyContent: "center",
    minHeight: 50,
    paddingHorizontal: 16,
  },
  danger: {
    backgroundColor: colors.danger,
  },
  disabled: {
    opacity: 0.5,
  },
  ghost: {
    backgroundColor: "transparent",
  },
  label: {
    ...typography.label,
    fontSize: 15,
  },
  pressed: {
    opacity: 0.85,
  },
  primary: {
    backgroundColor: colors.primary,
  },
  secondary: {
    backgroundColor: colors.primarySoft,
  },
})
