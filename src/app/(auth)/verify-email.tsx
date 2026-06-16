import { Redirect, router, useLocalSearchParams } from "expo-router"
import { useEffect, useState } from "react"
import { ScrollView, StyleSheet, Text, View } from "react-native"

import { Button } from "@/components/ui/Button"
import { routes } from "@/constants/routes"
import { resendVerificationEmail } from "@/features/auth/services/auth-service"

const COOLDOWN_SECONDS = 60

export default function VerifyEmail() {
  const params = useLocalSearchParams<{ email?: string }>()
  const email = typeof params.email === "string" && params.email ? params.email : null

  if (!email) {
    return <Redirect href={routes.login} />
  }

  return <VerifyEmailScreen email={email} />
}

function VerifyEmailScreen({ email }: { email: string }) {
  const [isSending, setIsSending] = useState(false)
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

  const resendLabel = isSending
    ? "Enviando..."
    : cooldown > 0
      ? `Reenviar em ${cooldown}s`
      : "Reenviar email"

  return (
    <ScrollView contentContainerStyle={styles.content} style={styles.container}>
      <View style={styles.iconWrapper}>
        <Text style={styles.iconCheck}>✓</Text>
      </View>

      <View style={styles.header}>
        <Text style={styles.title}>Verifique seu email</Text>
        <Text style={styles.subtitle}>
          Enviamos um link de verificação para o email abaixo. Confirme para liberar o acesso.
        </Text>
      </View>

      <View style={styles.emailBadge}>
        <Text style={styles.emailText}>{email}</Text>
      </View>

      <Text style={styles.hint}>Não recebeu? Verifique a pasta de spam ou reenvie o email.</Text>

      <View style={styles.actions}>
        <Button disabled={isSending || cooldown > 0} label={resendLabel} onPress={handleResend} />

        {message ? (
          <Text style={isError ? styles.error : styles.success}>{message}</Text>
        ) : null}

        <Button
          label="Fazer login"
          onPress={() => router.replace(routes.login)}
          variant="secondary"
        />
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
