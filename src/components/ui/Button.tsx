import { Pressable, StyleSheet, Text, type PressableProps } from "react-native"

type Props = PressableProps & {
  label: string
  variant?: "primary" | "secondary"
}

export function Button({ label, variant = "primary", disabled, style, ...props }: Props) {
  return (
    <Pressable
      accessibilityRole="button"
      disabled={disabled}
      style={(state) => {
        const { pressed } = state

        return [
          styles.button,
          variant === "secondary" && styles.secondary,
          disabled && styles.disabled,
          pressed && !disabled && styles.pressed,
          typeof style === "function" ? style(state) : style,
        ]
      }}
      {...props}
    >
      <Text style={[styles.label, variant === "secondary" && styles.secondaryLabel]}>{label}</Text>
    </Pressable>
  )
}

const styles = StyleSheet.create({
  button: {
    alignItems: "center",
    backgroundColor: "#0F766E",
    borderRadius: 8,
    minHeight: 48,
    justifyContent: "center",
    paddingHorizontal: 16,
  },
  disabled: {
    opacity: 0.6,
  },
  label: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "700",
  },
  pressed: {
    opacity: 0.85,
  },
  secondary: {
    backgroundColor: "#E0F2F1",
  },
  secondaryLabel: {
    color: "#0F766E",
  },
})
