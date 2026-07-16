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
    gap: 6,
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
  link: {
    color: colors.primary,
    fontWeight: "700",
  },
  linkCentered: {
    alignSelf: "center",
    color: colors.primary,
    fontWeight: "700",
    marginTop: spacing.xxl,
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
  success: {
    ...typography.caption,
    backgroundColor: colors.primarySoft,
    borderRadius: radius.control,
    color: colors.primarySoftText,
    fontSize: 14,
    padding: 12,
  },
  title: {
    color: colors.textPrimary,
    fontSize: 26,
    fontWeight: "800",
  },
})
