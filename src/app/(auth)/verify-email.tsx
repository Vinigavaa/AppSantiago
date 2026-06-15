import { Link, Redirect, router, useLocalSearchParams } from "expo-router"
import { useCallback, useEffect, useState } from "react"
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native"

import { Button } from "@/components/ui/Button"
import { routes } from "@/constants/routes"
import { useEmailVerification } from "@/features/auth/hooks/useEmailVerification"
import { canOpenMailApp, openMailApp } from "@/features/auth/lib/open-mail-app"
import { clearPendingCredentials } from "@/features/auth/services/pending-credentials"
import {
  clearPendingVerificationEmail,
  getPendingVerificationEmail,
} from "@/features/auth/services/verification-storage"

export default function VerifyEmail() {
  const params = useLocalSearchParams<{ email?: string }>()
  const [email, setEmail] = useState<string | null | undefined>(() =>
    typeof params.email === "string" && params.email ? params.email : undefined,
  )

  // Sem param (ex.: app reaberto), tenta recuperar o email persistido.
  useEffect(() => {
    if (email !== undefined) {
      return
    }

    let active = true

    getPendingVerificationEmail().then((stored) => {
      if (active) {
        setEmail(stored ?? null)
      }
    })

    return () => {
      active = false
    }
  }, [email])

  if (email === undefined) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator color="#0F766E" />
      </View>
    )
  }

  if (email === null) {
    return <Redirect href={routes.login} />
  }

  return <VerifyEmailContent email={email} />
}

function VerifyEmailContent({ email }: { email: string }) {
  const [canOpenMail, setCanOpenMail] = useState(false)

  const handleVerified = useCallback(async () => {
    clearPendingCredentials()
    await clearPendingVerificationEmail()
    router.replace(routes.home)
  }, [])

  const {
    resendStatus,
    resendMessage,
    cooldownRemaining,
    isResendDisabled,
    resend,
    isChecking,
    checkNow,
    checkMessage,
  } = useEmailVerification({ email, onVerified: handleVerified })

  useEffect(() => {
    let active = true

    canOpenMailApp().then((value) => {
      if (active) {
        setCanOpenMail(value)
      }
    })

    return () => {
      active = false
    }
  }, [])

  const handleOpenMail = useCallback(async () => {
    const opened = await openMailApp()

    if (!opened) {
      setCanOpenMail(false)
    }
  }, [])

  const resendLabel =
    resendStatus === "loading"
      ? "Enviando..."
      : cooldownRemaining > 0
        ? `Reenviar em ${cooldownRemaining}s`
        : "Reenviar email"

  return (
    <ScrollView contentContainerStyle={styles.content} style={styles.container}>
      <View style={styles.iconWrapper}>
        <Text style={styles.iconCheck}>✓</Text>
      </View>

      <View style={styles.header}>
        <Text style={styles.title}>Conta criada com sucesso!</Text>
        <Text style={styles.subtitle}>
          Enviamos um link de verificação para o email abaixo. Confirme para liberar o acesso.
        </Text>
      </View>

      <View style={styles.emailBadge}>
        <Text style={styles.emailText}>{email}</Text>
      </View>

      <Text style={styles.hint}>
        Verifique sua caixa de entrada e também a pasta de spam. O acesso ao app será liberado assim
        que você confirmar o email.
      </Text>

      <View style={styles.actions}>
        {canOpenMail ? <Button label="Abrir email" onPress={handleOpenMail} /> : null}

        <Button
          disabled={isResendDisabled}
          label={resendLabel}
          onPress={resend}
          variant="secondary"
        />

        {resendMessage ? (
          <Text style={resendStatus === "error" ? styles.error : styles.success}>
            {resendMessage}
          </Text>
        ) : null}

        <Pressable
          accessibilityRole="button"
          disabled={isChecking}
          onPress={checkNow}
          style={styles.checkButton}
        >
          {isChecking ? (
            <ActivityIndicator color="#0F766E" />
          ) : (
            <Text style={styles.checkLabel}>Já verifiquei meu email</Text>
          )}
        </Pressable>

        {checkMessage ? <Text style={styles.info}>{checkMessage}</Text> : null}
      </View>

      <Link href={routes.login} style={styles.link}>
        Voltar para o login
      </Link>
    </ScrollView>
  )
}

const styles = StyleSheet.create({
  actions: {
    gap: 12,
    marginTop: 28,
  },
  checkButton: {
    alignItems: "center",
    justifyContent: "center",
    minHeight: 44,
  },
  checkLabel: {
    color: "#0F766E",
    fontSize: 16,
    fontWeight: "700",
  },
  container: {
    backgroundColor: "#F8FAFC",
    flex: 1,
  },
  content: {
    flexGrow: 1,
    justifyContent: "center",
    padding: 24,
  },
  emailBadge: {
    alignItems: "center",
    backgroundColor: "#E0F2F1",
    borderRadius: 10,
    marginTop: 20,
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  emailText: {
    color: "#0F766E",
    fontSize: 16,
    fontWeight: "700",
  },
  error: {
    backgroundColor: "#FEE2E2",
    borderRadius: 8,
    color: "#991B1B",
    padding: 12,
  },
  header: {
    alignItems: "center",
    gap: 10,
    marginTop: 28,
  },
  hint: {
    color: "#475569",
    fontSize: 14,
    lineHeight: 20,
    marginTop: 18,
    textAlign: "center",
  },
  iconCheck: {
    color: "#166534",
    fontSize: 44,
    fontWeight: "800",
    lineHeight: 50,
  },
  iconWrapper: {
    alignItems: "center",
    alignSelf: "center",
    backgroundColor: "#DCFCE7",
    borderRadius: 56,
    height: 96,
    justifyContent: "center",
    width: 96,
  },
  info: {
    backgroundColor: "#E0F2F1",
    borderRadius: 8,
    color: "#0F766E",
    padding: 12,
    textAlign: "center",
  },
  link: {
    alignSelf: "center",
    color: "#0F766E",
    fontWeight: "700",
    marginTop: 28,
  },
  loading: {
    alignItems: "center",
    backgroundColor: "#F8FAFC",
    flex: 1,
    justifyContent: "center",
  },
  subtitle: {
    color: "#475569",
    fontSize: 16,
    textAlign: "center",
  },
  success: {
    backgroundColor: "#DCFCE7",
    borderRadius: 8,
    color: "#166534",
    padding: 12,
  },
  title: {
    color: "#0F172A",
    fontSize: 28,
    fontWeight: "800",
    textAlign: "center",
  },
})
