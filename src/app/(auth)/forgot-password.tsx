import { zodResolver } from "@hookform/resolvers/zod"
import { Link } from "expo-router"
import { Controller, useForm } from "react-hook-form"
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, View } from "react-native"

import { Button } from "@/components/ui/Button"
import { Input } from "@/components/ui/Input"
import { routes } from "@/constants/routes"
import { useAuth } from "@/features/auth/hooks/useAuth"
import {
  forgotPasswordSchema,
  type ForgotPasswordInput,
} from "@/features/auth/schemas/auth-schemas"

export default function ForgotPassword() {
  const { errorMessage, isSubmitting, requestPasswordReset, successMessage } = useAuth()
  const {
    control,
    handleSubmit,
    formState: { errors },
  } = useForm<ForgotPasswordInput>({
    resolver: zodResolver(forgotPasswordSchema),
    defaultValues: {
      email: "",
    },
  })

  return (
    <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} style={styles.container}>
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <View style={styles.header}>
          <Text style={styles.title}>Recuperar senha</Text>
          <Text style={styles.subtitle}>Informe seu email para receber o link de redefinição.</Text>
        </View>

        <View style={styles.form}>
          <Controller
            control={control}
            name="email"
            render={({ field: { onChange, value } }) => (
              <Input
                autoComplete="email"
                error={errors.email?.message}
                inputMode="email"
                label="Email"
                onChangeText={onChange}
                placeholder="voce@email.com"
                value={value}
              />
            )}
          />

          {errorMessage ? <Text style={styles.error}>{errorMessage}</Text> : null}
          {successMessage ? <Text style={styles.success}>{successMessage}</Text> : null}

          <Button
            disabled={isSubmitting}
            label={isSubmitting ? "Enviando..." : "Enviar link"}
            onPress={handleSubmit(requestPasswordReset)}
          />
        </View>

        <Link href={routes.login} style={styles.link}>
          Voltar para login
        </Link>
      </ScrollView>
    </KeyboardAvoidingView>
  )
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: "#F8FAFC",
    flex: 1,
  },
  content: {
    flexGrow: 1,
    justifyContent: "center",
    padding: 24,
  },
  error: {
    backgroundColor: "#FEE2E2",
    borderRadius: 8,
    color: "#991B1B",
    padding: 12,
  },
  form: {
    gap: 14,
  },
  header: {
    gap: 8,
    marginBottom: 28,
  },
  link: {
    alignSelf: "center",
    color: "#0F766E",
    fontWeight: "700",
    marginTop: 24,
  },
  subtitle: {
    color: "#475569",
    fontSize: 16,
  },
  success: {
    backgroundColor: "#DCFCE7",
    borderRadius: 8,
    color: "#166534",
    padding: 12,
  },
  title: {
    color: "#0F172A",
    fontSize: 32,
    fontWeight: "800",
  },
})
