import { Ionicons } from "@expo/vector-icons"
import { Redirect, router, useLocalSearchParams } from "expo-router"
import { useEffect, useState } from "react"
import { ActivityIndicator, ScrollView, StyleSheet, Text, View } from "react-native"

import { Button } from "@/components/ui/Button"
import { routes } from "@/constants/routes"
import { colors, radius, typography } from "@/features/client-home/theme"
import {
  getPasswordResetStatus,
  requestPasswordReset,
} from "@/features/auth/services/auth-service"
import {
  clearPendingPasswordReset,
  getPendingPasswordReset,
  savePendingPasswordReset,
} from "@/features/auth/storage"

const COOLDOWN_SECONDS = 60

export default function VerifyPasswordReset() {
  const params = useLocalSearchParams<{ email?: string }>()
  const paramEmail = typeof params.email === "string" && params.email ? params.email : null

  // O requestId nunca vem por parâmetro: ele é o segredo do fluxo e mora só no
  // armazenamento seguro. O email por parâmetro apenas evita o piscar da tela.
  const [pending, setPending] = useState<{ email: string; requestId: string } | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    let active = true

    getPendingPasswordReset().then((stored) => {
      if (!active) {
        return
      }

      setPending(stored)
      setIsLoading(false)
    })

    return () => {
      active = false
    }
  }, [])

  if (isLoading) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator color={colors.primary} />
      </View>
    )
  }

  if (!pending) {
    return <Redirect href={routes.login} />
  }

  return (
    <VerifyPasswordResetScreen
      email={paramEmail ?? pending.email}
      requestId={pending.requestId}
    />
  )
}

function VerifyPasswordResetScreen({
  email,
  requestId: initialRequestId,
}: {
  email: string
  requestId: string
}) {
  const [requestId, setRequestId] = useState(initialRequestId)
  const [isSending, setIsSending] = useState(false)
  const [isChecking, setIsChecking] = useState(false)
  const [message, setMessage] = useState<string | null>(null)
  const [isError, setIsError] = useState(false)
  // Um email já foi enviado na tela anterior, então o cooldown começa ativo.
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

    const result = await requestPasswordReset({ email })

    setIsSending(false)

    if (!result.success || !result.requestId) {
      setIsError(true)
      setMessage(result.message ?? "Não foi possível reenviar o email. Tente novamente.")
      return
    }

    // O reenvio cria uma nova solicitação e invalida a anterior no servidor:
    // guardar o requestId novo é o que mantém a tela utilizável.
    await savePendingPasswordReset({ email, requestId: result.requestId })
    setRequestId(result.requestId)
    setMessage("Email reenviado. Verifique sua caixa de entrada e o spam.")
    setCooldown(COOLDOWN_SECONDS)
  }

  async function handleCheckConfirmed() {
    if (isChecking) {
      return
    }

    setIsChecking(true)
    setMessage(null)
    setIsError(false)

    const result = await getPasswordResetStatus(requestId)

    setIsChecking(false)

    if (!result.success) {
      setIsError(true)
      setMessage(result.message ?? "Não foi possível verificar agora. Tente novamente.")
      return
    }

    if (!result.confirmed || !result.token) {
      setIsError(true)
      setMessage("Ainda não confirmamos sua solicitação. Abra o link enviado para o seu email.")
      return
    }

    await clearPendingPasswordReset()
    router.replace({ pathname: "/reset-password", params: { token: result.token } })
  }

  async function handleExit() {
    await clearPendingPasswordReset()
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
        <Ionicons color={colors.primary} name="mail-outline" size={48} />
      </View>

      <View style={styles.header}>
        <Text style={styles.title}>Confirme pelo email</Text>
        <Text style={styles.subtitle}>
          Enviamos um email de confirmação para o endereço abaixo. Abra a mensagem e clique no link
          para liberar a troca de senha.
        </Text>
      </View>

      <View style={styles.emailBadge}>
        <Text style={styles.emailText}>{email}</Text>
      </View>

      <Text style={styles.hint}>
        Depois de confirmar pelo email, volte aqui e toque em "Já verifiquei meu email" para
        escolher a nova senha. Não recebeu? Verifique a pasta de spam ou reenvie o email.
      </Text>

      <View style={styles.actions}>
        <Button
          disabled={cooldown > 0}
          label={resendLabel}
          loading={isSending}
          onPress={handleResend}
        />

        {message ? <Text style={isError ? styles.error : styles.success}>{message}</Text> : null}

        <Button
          label="Já verifiquei meu email"
          loading={isChecking}
          onPress={handleCheckConfirmed}
          variant="secondary"
        />

        <Text accessibilityRole="button" onPress={handleExit} style={styles.exitLink}>
          Voltar para login
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
