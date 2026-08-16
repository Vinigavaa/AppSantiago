import { StyleSheet } from "react-native"

import { colors, radius, spacing, typography } from "@/features/client-home/theme"

// Estilos compartilhados das telas de autenticação, em tokens do design system.
// Centralizados para que login, cadastro e recuperação sejam visualmente iguais.
export const authStyles = StyleSheet.create({
  container: {
    backgroundColor: colors.screenBg,
    flex: 1,
  },
  content: {
    flexGrow: 1,
    justifyContent: "center",
    padding: spacing.xxl,
  },
  error: {
    ...typography.caption,
    backgroundColor: colors.dangerSoft,
    borderRadius: radius.control,
    color: colors.danger,
    fontSize: 14,
    padding: 12,
  },
  footer: {
    alignItems: "center",
    flexDirection: "row",
    // Sem gap: o espaçamento vem do padding do próprio link, que existe para
    // dar a ele os 44pt de área tocável.
    justifyContent: "center",
    marginTop: spacing.xxl,
  },
  footerText: {
    ...typography.body,
    color: colors.textSecondary,
  },
  form: {
    gap: spacing.cardGap,
  },
  header: {
    gap: spacing.sm,
    marginBottom: 28,
  },
  logo: {
    alignSelf: "center",
    borderRadius: 22,
    height: 88,
    marginBottom: spacing.xl,
    width: 88,
  },
  // Links de navegação entre as telas de auth. O padding não é decorativo: a área
  // tocável de um <Text> é a sua caixa de layout, que sem isso fica na altura da
  // linha (~20pt) — abaixo dos 44pt mínimos das Human Interface Guidelines. Em
  // iPad, onde o app roda escalado em modo de compatibilidade, o alvo fica ainda
  // menor e o toque erra.
  link: {
    color: colors.primary,
    fontWeight: "700",
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.md,
  },
  linkCentered: {
    alignSelf: "center",
    color: colors.primary,
    fontWeight: "700",
    // O padding vertical já soma 12 acima do texto; a margem desconta isso para
    // o espaçamento visual continuar sendo o mesmo spacing.xxl de antes.
    marginTop: spacing.md,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.md,
  },
  loading: {
    alignItems: "center",
    backgroundColor: colors.screenBg,
    flex: 1,
    justifyContent: "center",
  },
  subtitle: {
    color: colors.textSecondary,
    fontSize: 16,
    lineHeight: 22,
  },
  title: {
    color: colors.textPrimary,
    fontSize: 26,
    fontWeight: "800",
  },
})
