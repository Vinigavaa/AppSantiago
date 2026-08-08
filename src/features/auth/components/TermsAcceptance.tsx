import { Ionicons } from "@expo/vector-icons"
import { Pressable, StyleSheet, Text, View } from "react-native"

import { openLegalPage, PRIVACY_URL, TERMS_URL } from "@/constants/legal"
import { colors, radius, typography } from "@/features/client-home/theme"

type Props = {
  value: boolean
  onChange: (value: boolean) => void
  error?: string
}

// Aceite explícito dos documentos legais no cadastro. A caixa nasce desmarcada:
// consentimento pré-marcado não é consentimento (LGPD) e é reprovado pelas lojas.
export function TermsAcceptance({ value, onChange, error }: Props) {
  return (
    <View style={styles.container}>
      <Pressable
        accessibilityLabel="Li e concordo com os Termos de Uso e a Política de Privacidade"
        accessibilityRole="checkbox"
        accessibilityState={{ checked: value }}
        onPress={() => onChange(!value)}
        style={styles.row}
      >
        <View style={[styles.box, value && styles.boxChecked]}>
          {value ? <Ionicons color={colors.onPrimary} name="checkmark" size={16} /> : null}
        </View>

        <Text style={styles.text}>
          Li e concordo com os{" "}
          <Text onPress={() => openLegalPage(TERMS_URL)} style={styles.link}>
            Termos de Uso
          </Text>{" "}
          e a{" "}
          <Text onPress={() => openLegalPage(PRIVACY_URL)} style={styles.link}>
            Política de Privacidade
          </Text>
          .
        </Text>
      </Pressable>

      {error ? <Text style={styles.error}>{error}</Text> : null}
    </View>
  )
}

const styles = StyleSheet.create({
  box: {
    alignItems: "center",
    borderColor: colors.chipInactiveBorder,
    borderRadius: radius.tag,
    borderWidth: 1,
    height: 22,
    justifyContent: "center",
    marginTop: 1,
    width: 22,
  },
  boxChecked: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  container: {
    gap: 6,
  },
  error: {
    ...typography.caption,
    color: colors.danger,
  },
  link: {
    color: colors.primary,
    fontWeight: "700",
    textDecorationLine: "underline",
  },
  row: {
    alignItems: "flex-start",
    flexDirection: "row",
    gap: 10,
  },
  text: {
    ...typography.body,
    color: colors.textSecondary,
    flex: 1,
  },
})
