import { Ionicons } from "@expo/vector-icons"
import { Redirect, router, useLocalSearchParams } from "expo-router"
import { useEffect, useState } from "react"
import { ActivityIndicator, ScrollView, StyleSheet, Text, View } from "react-native"

import { Button } from "@/components/ui/Button"
import { routes } from "@/constants/routes"
import { colors, radius, typography } from "@/features/client-home/theme"
import {
  getEmailVerificationStatus,
  resendVerificationEmail,
} from "@/features/auth/services/auth-service"
import { clearPendingVerificationEmail, getPendingVerificationEmail } from "@/features/auth/storage"

const COOLDOWN_SECONDS = 60

export default function VerifyEmail() {
  const params = useLocalSearchParams<{ email?: string }>()
  const paramEmail = typeof params.email === "string" && params.email ? params.email : null

  // Sem o parâmetro (app reaberto), tentamos recuperar o email persistido.
  const [email, setEmail] = useState<string | null>(paramEmail)
  const [isLoading, setIsLoading] = useState(!paramEmail)

  useEffect(() => {
    if (paramEmail) {
      return
    }

    let active = true

    getPendingVerificationEmail().then((stored) => {
      if (!active) {
        return
      }

      setEmail(stored)
      setIsLoading(false)
    })

    return () => {
      active = false
    }
  }, [paramEmail])

  if (isLoading) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator color={colors.primary} />
      </View>
    )
  }

  if (!email) {
    return <Redirect href={routes.login} />
  }

  return <VerifyEmailScreen email={email} />
}

function VerifyEmailScreen({ email }: { email: string }) {
  const [isSending, setIsSending] = useState(false)
  const [isChecking, setIsChecking] = useState(false)
  const [message, setMessage] = useState<string | null>(null)
  const [isError, setIsError] = useState(false)
  // Um email já foi enviado no cadastro, então o cooldown começa ativo.
  const [cooldown, setCooldown] = useState(COOLDOWN_SECONDS)

  useEffect(() => {
    if (cooldown <= 0) {
      return
    }

    const timeoutId = setTimeout(() => setCooldown((seconds) => seconds - 1), 1000)

    return () => clearTimeout(timeoutId)
  }, [cooldown])

  async function handleResend() {
    if (isSending || cooldown > 0) {
      return
    }

    setIsSending(true)
    setMessage(null)
    setIsError(false)

    const result = await resendVerificationEmail(email)

    setIsSending(false)

    if (!result.success) {
      setIsError(true)
      setMessage(result.message ?? "Não foi possível reenviar o email. Tente novamente.")
      return
    }

    setMessage("Email reenviado. Verifique sua caixa de entrada e o spam.")
    setCooldown(COOLDOWN_SECONDS)
  }

  async function handleCheckVerified() {
    if (isChecking) {
      return
    }

    setIsChecking(true)
    setMessage(null)
    setIsError(false)

    const result = await getEmailVerificationStatus(email)

    setIsChecking(false)

    if (!result.success) {
      setIsError(true)
      setMessage(result.message ?? "Não foi possível verificar agora. Tente novamente.")
      return
    }

    if (!result.verified) {
      setIsError(true)
      setMessage("Seu email ainda não foi confirmado. Verifique sua caixa de entrada e o spam.")
      return
    }

    await clearPendingVerificationEmail()
    router.replace(routes.login)
  }

  // Saída direta para o login, sem validar status nem respeitar cooldown.
  // Limpa o email pendente para não voltar à tela ao reabrir o app.
  async function handleExit() {
    await clearPendingVerificationEmail()
    router.replace(routes.login)
  }

  const resendLabel = isSending
    ? "Enviando..."
    : cooldown > 0
      ? `Reenviar em ${cooldown}s`
      : "Reenviar email"

  return (
    <ScrollView contentContainerStyle={styles.content} style={styles.container}>
      <View style={styles.iconWrapper}>
        <Ionicons color={colors.primary} name="checkmark" size={48} />
      </View>

      <View style={styles.header}>
        <Text style={styles.title}>Conta criada com sucesso!</Text>
        <Text style={styles.subtitle}>
          Enviamos um email de verificação para o endereço abaixo. Verifique sua caixa de entrada e
          clique no link recebido para ativar sua conta.
        </Text>
      </View>

      <View style={styles.emailBadge}>
        <Text style={styles.emailText}>{email}</Text>
      </View>

      <Text style={styles.hint}>
        O login só será liberado após a confirmação do email. Não recebeu? Verifique a pasta de spam
        ou reenvie o email.
      </Text>

      <View style={styles.actions}>
        <Button
          disabled={cooldown > 0}
          label={resendLabel}
          loading={isSending}
          onPress={handleResend}
        />

        {message ? (
          <Text style={isError ? styles.error : styles.success}>{message}</Text>
        ) : null}

        <Button
          label="Já verifiquei meu email"
          loading={isChecking}
          onPress={handleCheckVerified}
          variant="secondary"
        />

        <Text accessibilityRole="button" onPress={handleExit} style={styles.exitLink}>
          Sair
        </Text>
      </View>
    </ScrollView>
  )
}

const styles = StyleSheet.create({
  actions: {
    gap: 12,
    marginTop: 28,
  },
  container: {
    backgroundColor: colors.screenBg,
    flex: 1,
  },
  content: {
    flexGrow: 1,
    justifyContent: "center",
    padding: 24,
  },
  emailBadge: {
    alignItems: "center",
    backgroundColor: colors.primarySoft,
    borderRadius: radius.control,
    marginTop: 20,
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  emailText: {
    color: colors.primarySoftText,
    fontSize: 16,
    fontWeight: "700",
  },
  exitLink: {
    color: colors.textSecondary,
    fontSize: 15,
    fontWeight: "700",
    marginTop: 4,
    paddingVertical: 8,
    textAlign: "center",
  },
  error: {
    ...typography.caption,
    backgroundColor: colors.dangerSoft,
    borderRadius: radius.control,
    color: colors.danger,
    fontSize: 14,
    padding: 12,
  },
  header: {
    alignItems: "center",
    gap: 10,
    marginTop: 28,
  },
  hint: {
    ...typography.body,
    color: colors.textSecondary,
    fontSize: 14,
    marginTop: 18,
    textAlign: "center",
  },
  iconWrapper: {
    alignItems: "center",
    alignSelf: "center",
    backgroundColor: colors.primarySoft,
    borderRadius: 56,
    height: 96,
    justifyContent: "center",
    width: 96,
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
    textAlign: "center",
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
    textAlign: "center",
  },
})
